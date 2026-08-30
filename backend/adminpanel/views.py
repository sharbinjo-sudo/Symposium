import csv
import os
import posixpath
from urllib.parse import quote
from uuid import uuid4

from django.contrib.auth.hashers import check_password, make_password
from django.core.files.storage import default_storage
from django.http import FileResponse, HttpResponse
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.security import apply_no_store
from notifications.emailjs import send_participant_payment_rejection, send_participant_registration_confirmation
from registrations.models import Registration
from registrations.serializers import (
  AdminRegistrationCreateSerializer,
  AdminRegistrationSerializer,
  RegistrationActionSerializer
)
from registrations.services import DuplicateRegistrationError, create_registration, normalize_transaction_id

from .audit import log_admin_action
from .auth import SESSION_ADMIN_KEY, get_authenticated_admin, set_admin_session
from .models import AdminUser
from .permissions import IsAuthenticatedAdmin

DUMMY_PASSWORD_HASH = make_password("cyberpunk26-admin-dummy")

# Security: Maximum length for search queries to prevent DoS
MAX_SEARCH_LENGTH = 200
ADMIN_REGISTRATION_DEFAULT_LIMIT = 100
ADMIN_REGISTRATION_MAX_LIMIT = 500

# Security: Allowed path prefix for screenshot files
ALLOWED_SCREENSHOT_PREFIX = "payments/"


def _validate_search_length(search: str) -> str:
  """Validate and truncate search input to prevent DoS attacks."""
  if len(search) > MAX_SEARCH_LENGTH:
    return search[:MAX_SEARCH_LENGTH]
  return search


def _parse_positive_int(value: str | None, default: int) -> int:
  try:
    parsed_value = int(value or default)
  except (TypeError, ValueError):
    return default
  return max(parsed_value, 0)


def _is_safe_screenshot_path(path: str) -> bool:
  """
  Validate that the screenshot path is safe and doesn't contain directory traversal.
  Storage keys always use forward slashes regardless of OS, so we use posixpath
  instead of os.path to avoid Windows backslash conversion breaking the prefix check.
  """
  if not path:
    return False

  # Normalize to forward slashes (storage keys always use / on all platforms)
  normalized = posixpath.normpath(path)

  # Check for directory traversal attempts
  if ".." in path or ".." in normalized:
    return False

  # Path must start with the allowed prefix
  if not normalized.startswith(ALLOWED_SCREENSHOT_PREFIX):
    return False

  # Check for absolute paths
  if posixpath.isabs(normalized):
    return False

  # Check for null bytes
  if "\x00" in path or "\x00" in normalized:
    return False

  return True


def get_admin_registration_queryset(request):
  queryset = Registration.objects.select_related("event").prefetch_related("participants").all()

  event_code = (request.query_params.get("event") or "").strip()
  payment_status = (request.query_params.get("payment_status") or "").strip()
  search = (request.query_params.get("search") or "").strip()

  if event_code:
    queryset = queryset.filter(event__event_code=event_code)
  if payment_status:
    queryset = queryset.filter(payment_status=payment_status)
  if search:
    # Security: Validate search length to prevent DoS
    search = _validate_search_length(search)
    queryset = queryset.filter(
      Q(registration_code__icontains=search)
      | Q(team_name__icontains=search)
      | Q(transaction_id__icontains=search)
      | Q(participants__full_name__icontains=search)
      | Q(participants__email__icontains=search)

      | Q(participants__mobile_number__icontains=search)
    )

  return queryset.distinct()


class AdminLoginView(APIView):
  permission_classes = [AllowAny]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "admin_login"

  def post(self, request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    admin = AdminUser.objects.filter(email=email, is_active=True).first()
    if admin is None:
      check_password(password, DUMMY_PASSWORD_HASH)
      if email:
        log_admin_action(
          admin=None,
          action="login_failed",
          entity_type="admin_user",
          entity_id="[REDACTED]",
          metadata={"reason": "invalid_credentials"}
        )
      return apply_no_store(Response({"ok": False}, status=status.HTTP_401_UNAUTHORIZED))

    if not admin.verify_password(password):
      # Security: Don't log email (PII) in failed login attempts
      log_admin_action(
        admin=None,
        action="login_failed",
        entity_type="admin_user",
        entity_id="[REDACTED]",
        metadata={"reason": "invalid_credentials"}
      )
      return apply_no_store(Response({"ok": False}, status=status.HTTP_401_UNAUTHORIZED))

    request.session.cycle_key()
    # Security: Use set_admin_session to track session creation time
    set_admin_session(request, admin)
    request.session.set_expiry(60 * 60 * 8)
    log_admin_action(admin=admin, action="login", entity_type="admin_user", entity_id=str(admin.pk))
    return apply_no_store(Response({"ok": True}))


class AdminLogoutView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    admin = get_authenticated_admin(request)
    request.session.flush()
    if admin:
      log_admin_action(admin=admin, action="logout", entity_type="admin_user", entity_id=str(admin.pk))
    return apply_no_store(Response({"ok": True}))


class AdminSessionView(APIView):
  permission_classes = [IsAuthenticatedAdmin]

  def get(self, request):
    admin = get_authenticated_admin(request)
    return apply_no_store(Response(
      {
        "ok": True,
        "admin": {
          "name": admin.name,
          "email": admin.email,
          "role": admin.role
        }
      }
    ))


class AdminDashboardSummaryView(APIView):
  permission_classes = [IsAuthenticatedAdmin]

  def get(self, request):
    latest_registration = (
      Registration.objects.select_related("event").prefetch_related("participants").order_by("-created_at").first()
    )
    latest_payload = None

    if latest_registration:
      lead_participant = latest_registration.participants.order_by("participant_number").first()
      latest_payload = {
        "registrationCode": latest_registration.registration_code,
        "eventName": latest_registration.event.event_name,
        "teamName": latest_registration.team_name or "Solo entry",
        "participantName": lead_participant.full_name if lead_participant else "Participant",
        "participantEmail": lead_participant.email if lead_participant else "",
        "paymentStatus": latest_registration.payment_status,
        "createdAt": latest_registration.created_at.isoformat()
      }

    return apply_no_store(Response(
      {
        "totalRegistrations": Registration.objects.count(),
        "pendingPayments": Registration.objects.filter(payment_status=Registration.PAYMENT_PENDING).count(),
        "verifiedPayments": Registration.objects.filter(payment_status=Registration.PAYMENT_VERIFIED).count(),
        "latestRegistration": latest_payload
      }
    ))


class AdminRegistrationListView(APIView):
  permission_classes = [IsAuthenticatedAdmin]

  def get(self, request):
    queryset = get_admin_registration_queryset(request)
    count = queryset.count()
    limit = min(
      _parse_positive_int(request.query_params.get("limit"), ADMIN_REGISTRATION_DEFAULT_LIMIT),
      ADMIN_REGISTRATION_MAX_LIMIT
    )
    offset = _parse_positive_int(request.query_params.get("offset"), 0)
    serializer = AdminRegistrationSerializer(queryset[offset:offset + limit], many=True)
    return apply_no_store(
      Response(
        {
          "count": count,
          "limit": limit,
          "offset": offset,
          "results": serializer.data
        }
      )
    )


class AdminRegistrationActionView(APIView):
  permission_classes = [IsAuthenticatedAdmin]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "admin_action"

  def post(self, request, registration_code: str):
    admin = get_authenticated_admin(request)

    try:
      registration = Registration.objects.get(registration_code=registration_code)
    except Registration.DoesNotExist:
      return apply_no_store(Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND))

    serializer = RegistrationActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    update_fields = ["updated_at"]

    if "paymentStatus" in data:
      registration.payment_status = data["paymentStatus"]
      update_fields.append("payment_status")
    if "adminNote" in data:
      registration.admin_note = data["adminNote"]
      update_fields.append("admin_note")

    registration.save(update_fields=update_fields)
    log_admin_action(
      admin=admin,
      action="update_registration",
      entity_type="registration",
      entity_id=registration.registration_code,
      metadata=data
    )

    return apply_no_store(Response({"ok": True}))


class AdminRegistrationCreateView(APIView):
  permission_classes = [IsAuthenticatedAdmin]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "admin_action"

  def post(self, request):
    admin = get_authenticated_admin(request)
    serializer = AdminRegistrationCreateSerializer(
      data={
        **request.data,
        "idempotencyKey": uuid4().hex
      }
    )
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    payment_status = data.get("paymentStatus", Registration.PAYMENT_VERIFIED)

    if data.get("sendEmail", False) and payment_status != Registration.PAYMENT_VERIFIED:
      return apply_no_store(
        Response(
          {"detail": "Verify the payment before sending the confirmation email."},
          status=status.HTTP_400_BAD_REQUEST
        )
      )

    try:
      registration = create_registration(
        {
          **data,
          "normalized_transaction_id": normalize_transaction_id(data["transactionId"]),
          "payment_provider": data.get("paymentProvider", Registration.PAYMENT_PROVIDER_MANUAL),
          "payment_date": data["paymentDate"],
          "payment_screenshot_path": "",
          "payment_status": payment_status,
          "consentGiven": True
        }
      )
    except DuplicateRegistrationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST))

    if data.get("sendEmail", False):
      send_participant_registration_confirmation(registration)
      registration.refresh_from_db()
    registration.admin_note = data.get("adminNote", "").strip() or None
    registration.save(update_fields=["admin_note", "updated_at"])

    log_admin_action(
      admin=admin,
      action="create_registration",
      entity_type="registration",
      entity_id=registration.registration_code,
      metadata={
        "eventCode": data["eventCode"],
        "teamSize": data["teamSize"],
        "paymentStatus": payment_status
      }
    )

    response_serializer = AdminRegistrationSerializer(registration)
    return apply_no_store(Response(response_serializer.data, status=status.HTTP_201_CREATED))


class AdminRegistrationDeleteView(APIView):
  permission_classes = [IsAuthenticatedAdmin]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "admin_action"

  def delete(self, request, registration_code: str):
    admin = get_authenticated_admin(request)

    try:
      registration = Registration.objects.get(registration_code=registration_code)
    except Registration.DoesNotExist:
      return apply_no_store(Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND))

    screenshot_path = registration.payment_screenshot_path
    registration.delete()

    if screenshot_path:
      try:
        if default_storage.exists(screenshot_path):
          default_storage.delete(screenshot_path)
      except Exception:
        pass

    log_admin_action(
      admin=admin,
      action="delete_registration",
      entity_type="registration",
      entity_id=registration_code
    )
    return apply_no_store(Response({"ok": True}))


class AdminResendEmailView(APIView):
  permission_classes = [IsAuthenticatedAdmin]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "admin_action"

  def post(self, request, registration_code: str):
    admin = get_authenticated_admin(request)

    try:
      registration = Registration.objects.get(registration_code=registration_code)
    except Registration.DoesNotExist:
      return apply_no_store(Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND))

    if registration.payment_status == Registration.PAYMENT_VERIFIED:
      email_type = "confirmation"
      sent = send_participant_registration_confirmation(registration)
    elif registration.payment_status == Registration.PAYMENT_REJECTED:
      email_type = "rejection"
      sent = send_participant_payment_rejection(registration)
    else:
      return apply_no_store(
        Response(
          {"detail": "Set the payment to verified or rejected before sending a participant email."},
          status=status.HTTP_400_BAD_REQUEST
        )
      )

    log_admin_action(
      admin=admin,
      action=f"send_{email_type}_email",
      entity_type="registration",
      entity_id=registration.registration_code,
      metadata={"sent": sent, "emailType": email_type}
    )

    return apply_no_store(Response({"ok": sent, "emailType": email_type}))


class AdminRegistrationExportView(APIView):
  permission_classes = [IsAuthenticatedAdmin]

  def get(self, request):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f"attachment; filename={quote('cyberpunk26-registrations.csv')}"
    writer = csv.writer(response)
    writer.writerow([
      "Registration Code",
      "Event",
      "Team",
      "Lead Participant",
      "Lead Email",
      "Food Preferences",
      "Amount",
      "Transaction ID",
      "Payment Provider",
      "Payment Status",
      "Email Status",
      "Created At"
    ])

    for registration in get_admin_registration_queryset(request):
      lead_participant = registration.participants.order_by("participant_number").first()
      writer.writerow(
        [
          registration.registration_code,
          registration.event.event_name,
          registration.team_name or "",
          lead_participant.full_name if lead_participant else "",
          lead_participant.email if lead_participant else "",
          ", ".join(participant.get_food_preference_display() for participant in registration.participants.all()),
          registration.total_amount,
          registration.transaction_id,
          registration.payment_provider,
          registration.payment_status,
          registration.email_status,
          registration.created_at.isoformat()
        ]
      )

    return apply_no_store(response)


class AdminScreenshotView(APIView):
  permission_classes = [IsAuthenticatedAdmin]

  def get(self, request, registration_code: str):
    try:
      registration = Registration.objects.get(registration_code=registration_code)
    except Registration.DoesNotExist:
      return apply_no_store(Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND))

    screenshot_path = registration.payment_screenshot_path
    if not screenshot_path:
      return apply_no_store(Response({"detail": "Screenshot not found."}, status=status.HTTP_404_NOT_FOUND))

    # Security: Validate path to prevent directory traversal attacks
    if not _is_safe_screenshot_path(screenshot_path):
      return apply_no_store(Response({"detail": "Invalid screenshot path."}, status=status.HTTP_400_BAD_REQUEST))

    if not default_storage.exists(screenshot_path):
      return apply_no_store(Response({"detail": "Screenshot not found."}, status=status.HTTP_404_NOT_FOUND))

    file_handle = default_storage.open(screenshot_path, "rb")
    return apply_no_store(FileResponse(file_handle))
