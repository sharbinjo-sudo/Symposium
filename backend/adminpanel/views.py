import csv
from urllib.parse import quote

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
from registrations.serializers import AdminRegistrationSerializer, RegistrationActionSerializer

from .audit import log_admin_action
from .auth import SESSION_ADMIN_KEY, get_authenticated_admin
from .models import AdminUser
from .permissions import IsAuthenticatedAdmin


class AdminLoginView(APIView):
  permission_classes = [AllowAny]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "admin_login"

  def post(self, request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    try:
      admin = AdminUser.objects.get(email=email, is_active=True)
    except AdminUser.DoesNotExist:
      return apply_no_store(Response({"ok": False}, status=status.HTTP_401_UNAUTHORIZED))

    if not admin.verify_password(password):
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
    latest_registration = Registration.objects.select_related("event").prefetch_related("participants").first()
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
    queryset = Registration.objects.select_related("event").prefetch_related("participants").all()

    event_code = request.query_params.get("event")
    payment_status = request.query_params.get("payment_status")
    search = request.query_params.get("search")

    if event_code:
      queryset = queryset.filter(event__event_code=event_code)
    if payment_status:
      queryset = queryset.filter(payment_status=payment_status)
    if search:
      queryset = queryset.filter(Q(registration_code__icontains=search) | Q(team_name__icontains=search))

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
    writer.writerow(["Registration Code", "Event", "Team", "Payment Status", "Email Status", "Created At"])

    for registration in Registration.objects.select_related("event").all():
      writer.writerow(
        [
          registration.registration_code,
          registration.event.event_name,
          registration.team_name or "",
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

    if not default_storage.exists(registration.payment_screenshot_path):
      return apply_no_store(Response({"detail": "Screenshot not found."}, status=status.HTTP_404_NOT_FOUND))

    file_handle = default_storage.open(registration.payment_screenshot_path, "rb")
    return apply_no_store(FileResponse(file_handle))
