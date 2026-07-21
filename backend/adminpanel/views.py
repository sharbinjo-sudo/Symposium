import csv
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
from notifications.emailjs import send_registration_notifications
from registrations.models import Registration
from registrations.serializers import (
  AdminRegistrationCreateSerializer,
  AdminRegistrationSerializer,
  RegistrationActionSerializer
)
from registrations.services import DuplicateRegistrationError, create_registration, normalize_transaction_id

from .audit import log_admin_action
from .auth import SESSION_ADMIN_KEY, get_authenticated_admin
from .models import AdminUser
from .permissions import IsAuthenticatedAdmin

DUMMY_PASSWORD_HASH = make_password("cyberpunk26-admin-dummy")


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
    queryset = queryset.filter(
      Q(registration_code__icontains=search)
      | Q(team_name__icontains=search)
      | Q(transaction_id__icontains=search)
      | Q(participants__full_name__icontains=search)
      | Q(participants__email__icontains=search)
      | Q(participants__roll_number__icontains=search)
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
          entity_id=email,
          metadata={"reason": "invalid_credentials"}
        )
      return apply_no_store(Response({"ok": False}, status=status.HTTP_401_UNAUTHORIZED))

    if not admin.verify_password(password):
      log_admin_action(
        admin=None,
        action="login_failed",
        entity_type="admin_user",
        entity_id=email,
        metadata={"reason": "invalid_credentials"}
      )
      return apply_no_store(Response({"ok": False}, status=status.HTTP_401_UNAUTHORIZED))

    request.session.cycle_key()
    request.session[SESSION_ADMIN_KEY] = admin.pk
    request.session.set_expiry(60 * 60 * 8)
    log_admin_action(admin=admin, action="login", entity_type="admin_user", entity_id=str(admin.pk))
    return apply_no_store(Response({"ok": True}))


class AdminLogoutView(APIView):
  permission_classes = [IsAuthenticatedAdmin]

  def post(self, request):
    admin = get_authenticated_admin(request)
    request.session.flush()
    if admin:
      log_admin_action(admin=admin, action="logout", entity_type="admin_user", entity_id=str(admin.pk))
    return apply_no_store(Response({"ok": True}))


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
        "attendanceMarked": Registration.objects.filter(attendance_marked=True).count(),
        "latestRegistration": latest_payload
      }
    ))


class AdminRegistrationListView(APIView):
  permission_classes = [IsAuthenticatedAdmin]

  def get(self, request):
    queryset = get_admin_registration_queryset(request)
    serializer = AdminRegistrationSerializer(queryset[:200], many=True)
    return apply_no_store(Response(serializer.data))


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
    if "attendanceMarked" in data:
      registration.attendance_marked = data["attendanceMarked"]
      update_fields.append("attendance_marked")

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

    try:
      registration = create_registration(
        {
          **data,
          "normalized_transaction_id": normalize_transaction_id(data["transactionId"]),
          "payment_provider": data.get("paymentProvider", Registration.PAYMENT_PROVIDER_RAZORPAY),
          "payment_order_id": "",
          "payment_signature": "",
          "payment_date": data["paymentDate"],
          "payment_screenshot_path": "",
          "payment_status": data.get("paymentStatus", Registration.PAYMENT_VERIFIED),
          "consentGiven": True
        }
      )
    except DuplicateRegistrationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST))

    registration.admin_note = data.get("adminNote", "").strip() or None
    registration.attendance_marked = data.get("attendanceMarked", False)
    if data.get("sendEmail", True):
      registration.email_status = Registration.EMAIL_SENT if send_registration_notifications(registration) else Registration.EMAIL_FAILED
    registration.save(update_fields=["admin_note", "attendance_marked", "email_status", "updated_at"])

    log_admin_action(
      admin=admin,
      action="create_registration",
      entity_type="registration",
      entity_id=registration.registration_code,
      metadata={
        "eventCode": data["eventCode"],
        "teamSize": data["teamSize"],
        "paymentStatus": data.get("paymentStatus", Registration.PAYMENT_VERIFIED)
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


class AdminRegistrationClearView(APIView):
  permission_classes = [IsAuthenticatedAdmin]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "admin_action"

  def post(self, request):
    admin = get_authenticated_admin(request)
    registrations = list(Registration.objects.all())
    deleted_count = len(registrations)
    screenshot_paths = [registration.payment_screenshot_path for registration in registrations if registration.payment_screenshot_path]

    Registration.objects.all().delete()

    for screenshot_path in screenshot_paths:
      try:
        if default_storage.exists(screenshot_path):
          default_storage.delete(screenshot_path)
      except Exception:
        continue

    log_admin_action(
      admin=admin,
      action="clear_registrations",
      entity_type="registration",
      entity_id="all",
      metadata={"deleted": deleted_count}
    )
    return apply_no_store(Response({"ok": True, "deleted": deleted_count}))


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

    sent = send_registration_notifications(registration)
    registration.email_status = Registration.EMAIL_SENT if sent else Registration.EMAIL_FAILED
    registration.save(update_fields=["email_status", "updated_at"])

    log_admin_action(
      admin=admin,
      action="resend_email",
      entity_type="registration",
      entity_id=registration.registration_code,
      metadata={"sent": sent}
    )

    return apply_no_store(Response({"ok": sent}))


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
      "Transaction ID",
      "Payment Status",
      "Attendance Marked",
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
          registration.transaction_id,
          registration.payment_status,
          "Yes" if registration.attendance_marked else "No",
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

    if not registration.payment_screenshot_path:
      return apply_no_store(Response({"detail": "Screenshot not found."}, status=status.HTTP_404_NOT_FOUND))

    if not default_storage.exists(registration.payment_screenshot_path):
      return apply_no_store(Response({"detail": "Screenshot not found."}, status=status.HTTP_404_NOT_FOUND))

    file_handle = default_storage.open(registration.payment_screenshot_path, "rb")
    return apply_no_store(FileResponse(file_handle))
