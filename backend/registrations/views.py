import time

from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.security import apply_no_store
from notifications.emailjs import send_admin_registration_notification
from .models import Registration

# Security: Constant time delay to prevent timing attacks on status lookup
STATUS_LOOKUP_MIN_DELAY = 0.1  # 100ms minimum delay

from .serializers import (
  RegistrationResponseSerializer,
  RegistrationStatusLookupSerializer,
  RegistrationStatusResponseSerializer,
  RegistrationSubmitSerializer
)
from .services import (
  DuplicateRegistrationError,
  create_registration
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


class RegistrationStatusLookupView(APIView):
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "status_lookup"

  def post(self, request):
    start_time = time.time()
    
    serializer = RegistrationStatusLookupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    registration = (
      Registration.objects.select_related("event")
      .prefetch_related("participants")
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
