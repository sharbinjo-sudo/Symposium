import time

from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.security import apply_no_store
from notifications.emailjs import send_admin_registration_notification
from .models import Registration
from .models import Participant

# Security: Constant time delay to prevent timing attacks on status lookup
STATUS_LOOKUP_MIN_DELAY = 0.1  # 100ms minimum delay

from .serializers import (
  RegistrationPrecheckSerializer,
  RegistrationResponseSerializer,
  RegistrationStatusLookupSerializer,
  RegistrationStatusResponseSerializer,
  RegistrationSubmitSerializer
)
from .services import (
  DuplicateRegistrationError,
  create_registration,
  normalize_email,
  normalize_mobile
)


class RegistrationCreateView(APIView):
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "registration_submit"

  def post(self, request):
    serializer = RegistrationSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    existing_registration = Registration.objects.filter(
      idempotency_key=serializer.validated_data["idempotencyKey"]
    ).first()
    if existing_registration:
      response_serializer = RegistrationResponseSerializer(existing_registration)
      return apply_no_store(Response(response_serializer.data, status=status.HTTP_200_OK))

    try:
      registration = create_registration(serializer.validated_data)
    except DuplicateRegistrationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST))

    send_admin_registration_notification(registration)

    response_serializer = RegistrationResponseSerializer(registration)
    return apply_no_store(Response(response_serializer.data, status=status.HTTP_201_CREATED))


class RegistrationPrecheckView(APIView):
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "registration_precheck"

  def post(self, request):
    serializer = RegistrationPrecheckSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    field_errors: dict[str, str] = {}

    event_codes = data.get("eventCodes") or []
    event_code = data.get("eventCode", "")
    if event_code and event_code not in event_codes:
      event_codes = [event_code, *event_codes]
    event_codes = list(dict.fromkeys(event_codes))
    active_registrations = Registration.objects.exclude(payment_status=Registration.PAYMENT_REJECTED)
    active_participants = Participant.objects.exclude(registration__payment_status=Registration.PAYMENT_REJECTED)

    if {"WC", "VS"}.issubset(set(event_codes)):
      field_errors["eventCodes"] = (
        "Choose either Web Craft or Visualytics, not both, due to the event schedule. "
        "Check Timeline page for more details."
      )

    transaction_id = data.get("transactionId", "")
    if transaction_id and active_registrations.filter(transaction_id=transaction_id).exists():
      field_errors["transactionId"] = "This UPI transaction ID is already registered."

    seen_emails: dict[str, int] = {}
    seen_mobiles: dict[str, int] = {}
    for index, participant in enumerate(data.get("participants", [])):
      email = normalize_email(participant.get("email", ""))
      mobile = normalize_mobile(participant.get("mobileNumber", ""))

      if email:
        email_key = f"participant-{index}-email"
        if email in seen_emails:
          field_errors[email_key] = "This email is repeated in the same registration."
          field_errors.setdefault(f"participant-{seen_emails[email]}-email", "This email is repeated in the same registration.")
        elif active_participants.filter(email=email).exists():
          field_errors[email_key] = "This email is already registered."
        seen_emails[email] = index

      if mobile:
        mobile_key = f"participant-{index}-mobileNumber"
        if mobile in seen_mobiles:
          field_errors[mobile_key] = "This mobile number is repeated in the same registration."
          field_errors.setdefault(
            f"participant-{seen_mobiles[mobile]}-mobileNumber",
            "This mobile number is repeated in the same registration."
          )
        elif active_participants.filter(mobile_number=mobile).exists():
          field_errors[mobile_key] = "This mobile number is already registered."
        seen_mobiles[mobile] = index

    if field_errors:
      return apply_no_store(
        Response(
          {
            **field_errors,
            "detail": "Please fix the duplicate registration details before continuing."
          },
          status=status.HTTP_400_BAD_REQUEST
        )
      )

    return apply_no_store(Response({"ok": True}, status=status.HTTP_200_OK))


class RegistrationStatusLookupView(APIView):
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "status_lookup"

  def post(self, request):
    start_time = time.time()
    
    serializer = RegistrationStatusLookupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    registration = (
      Registration.objects.select_related("event")
      .prefetch_related("participants", "selected_events")
      .filter(
        registration_code__iexact=serializer.validated_data["registrationCode"],
        participants__email__iexact=serializer.validated_data["email"]
      )
      .distinct()
      .first()
    )

    # Security: Ensure minimum response time to prevent timing attacks
    elapsed = time.time() - start_time
    if elapsed < STATUS_LOOKUP_MIN_DELAY:
      time.sleep(STATUS_LOOKUP_MIN_DELAY - elapsed)

    if registration is None:
      # Security: Generic error message to prevent user enumeration
      return apply_no_store(
        Response(
          {"detail": "If a registration exists with that code and email, it will be shown."},
          status=status.HTTP_404_NOT_FOUND
        )
      )

    response_serializer = RegistrationStatusResponseSerializer(registration)
    return apply_no_store(Response(response_serializer.data, status=status.HTTP_200_OK))
