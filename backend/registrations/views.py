import time

from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.security import apply_no_store
from notifications.emailjs import send_registration_notifications
from .models import Registration

# Security: Constant time delay to prevent timing attacks on status lookup
STATUS_LOOKUP_MIN_DELAY = 0.1  # 100ms minimum delay

from .serializers import (
  RegistrationPaymentOrderSerializer,
  RegistrationResponseSerializer,
  RegistrationStatusLookupSerializer,
  RegistrationStatusResponseSerializer,
  RegistrationSubmitSerializer
)
from .services import (
  DuplicateRegistrationError,
  PaymentConfigurationError,
  PaymentGatewayError,
  PaymentVerificationError,
  create_payment_order,
  create_registration,
  ensure_duplicate_rules,
  resolve_verified_payment
)


class RegistrationPaymentOrderView(APIView):
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "registration_submit"

  def post(self, request):
    serializer = RegistrationPaymentOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    if Registration.objects.filter(idempotency_key=serializer.validated_data["idempotencyKey"]).exists():
      return apply_no_store(
        Response({"detail": "This registration has already been submitted."}, status=status.HTTP_409_CONFLICT)
      )

    try:
      ensure_duplicate_rules(serializer.validated_data["event"], serializer.validated_data["participants"])
      order_payload = create_payment_order(serializer.validated_data)
    except DuplicateRegistrationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST))
    except PaymentConfigurationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE))
    except PaymentGatewayError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY))

    return apply_no_store(Response(order_payload, status=status.HTTP_201_CREATED))


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
      serializer.validated_data.update(resolve_verified_payment(serializer.validated_data))
      registration = create_registration(serializer.validated_data)
    except DuplicateRegistrationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST))
    except PaymentConfigurationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE))
    except PaymentVerificationError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST))
    except PaymentGatewayError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY))

    registration.email_status = (
      "sent" if send_registration_notifications(registration) else registration.EMAIL_FAILED
    )
    registration.save(update_fields=["email_status", "updated_at"])

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
