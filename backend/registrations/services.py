from base64 import b64encode
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import hmac
import json
import re
from urllib import request
from urllib.error import HTTPError, URLError
from uuid import uuid4

from django.conf import settings
from django.core.signing import BadSignature, Signer
from django.db import IntegrityError, transaction
from django.utils import timezone

from events.models import Event

from .models import Participant, PaymentAttempt, Registration

UPLOAD_SIGNER = Signer(salt="payment-proof")

CASHFREE_API_BASE = {
    "sandbox": "https://sandbox.cashfree.com/pg",
    "production": "https://api.cashfree.com/pg",
}


class DuplicateRegistrationError(Exception):
  pass


class PaymentConfigurationError(Exception):
  pass


class PaymentGatewayError(Exception):
  pass


class PaymentVerificationError(Exception):
  pass


def normalize_transaction_id(value: str) -> str:
  return value.strip()


def normalize_email(value: str) -> str:
  return value.strip().lower()


def normalize_mobile(value: str) -> str:
  compact_value = re.sub(r"[\s-]+", "", value.strip())
  compact_value = compact_value.replace("(", "").replace(")", "")
  if compact_value.startswith("91") and not compact_value.startswith("+91"):
    compact_value = f"+{compact_value}"
  if len(compact_value) == 10 and compact_value[0].isdigit():
    compact_value = f"+91{compact_value}"
  return compact_value


def compute_total_amount(event: Event, team_size: int) -> Decimal:
  if event.registration_fee_type == Event.FEE_TYPE_PER_TEAM:
    return event.registration_fee
  return event.registration_fee * team_size


def amount_to_subunits(amount: Decimal) -> int:
  normalized_amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
  return int((normalized_amount * 100).to_integral_value(rounding=ROUND_HALF_UP))


def build_payment_payload_fingerprint(validated_data: dict) -> str:
  event = validated_data["event"]
  team_name = (validated_data.get("teamName") or "").strip()
  if event.maximum_team_size <= 1:
    team_name = ""

  payload = {
    "amount": amount_to_subunits(validated_data["total_amount"]),
    "event_code": event.event_code,
    "idempotency_key": validated_data["idempotencyKey"].strip(),
    "participants": [
      {
        "college_name": participant["collegeName"].strip(),
        "department": participant["department"].strip(),
        "email": normalize_email(participant["email"]),
        "food_preference": participant["foodPreference"],
        "full_name": participant["fullName"].strip(),
        "is_team_leader": bool(participant["isTeamLeader"]),
        "mobile_number": normalize_mobile(participant["mobileNumber"]),

        "year_of_study": participant["yearOfStudy"].strip()
      }
      for participant in validated_data["participants"]
    ],
    "team_name": team_name,
    "team_size": validated_data["teamSize"]
  }
  fingerprint_payload = json.dumps(payload, separators=(",", ":"), sort_keys=True)
  return hashlib.sha256(fingerprint_payload.encode("utf-8")).hexdigest()


def _get_cashfree_credentials() -> tuple[str, str]:
  app_id = settings.CASHFREE_APP_ID.strip()
  secret_key = settings.CASHFREE_SECRET_KEY.strip()

  if not app_id or not secret_key:
    raise PaymentConfigurationError("Cashfree API keys are not configured on the server.")

  return app_id, secret_key


def _get_cashfree_base_url() -> str:
  env = getattr(settings, "CASHFREE_ENV", "sandbox").strip().lower()
  return CASHFREE_API_BASE.get(env, CASHFREE_API_BASE["sandbox"])


def _cashfree_request(method: str, path: str, payload: dict | None = None) -> dict:
  app_id, secret_key = _get_cashfree_credentials()
  base_url = _get_cashfree_base_url()
  api_version = getattr(settings, "CASHFREE_API_VERSION", "2025-01-01")

  data = json.dumps(payload).encode("utf-8") if payload is not None else None
  headers = {
    "X-Client-Id": app_id,
    "X-Client-Secret": secret_key,
    "X-Api-Version": api_version,
    "Accept": "application/json"
  }

  if payload is not None:
    headers["Content-Type"] = "application/json"

  req = request.Request(
    url=f"{base_url}{path}",
    data=data,
    headers=headers,
    method=method.upper()
  )

  try:
    with request.urlopen(req, timeout=12) as response:
      body = response.read().decode("utf-8")
  except HTTPError as exc:
    try:
      error_body = exc.read().decode("utf-8", errors="replace")
      error_payload = json.loads(error_body)
      message = (
        error_payload.get("message")
        or error_payload.get("error_description")
        or error_body
      )
    except Exception:
      message = f"Cashfree rejected the request with status {exc.code}."
    raise PaymentGatewayError(message) from exc
  except URLError as exc:
    raise PaymentGatewayError("Unable to reach Cashfree right now. Please try again shortly.") from exc

  try:
    return json.loads(body)
  except json.JSONDecodeError as exc:
    raise PaymentGatewayError("Cashfree returned an unexpected response.") from exc


def build_order_id(event_code: str, idempotency_key: str, payload_hash: str = "") -> str:
  idempotency_part = idempotency_key.replace("-", "")[:12]
  hash_part = payload_hash[:8] if payload_hash else "00000000"
  nonce_part = uuid4().hex[:6]
  order_id = f"cp26-{event_code.lower()}-{idempotency_part}-{hash_part}-{nonce_part}"
  return order_id[:45]


def _build_payment_order_response(app_id: str, event: Event, lead_participant: dict, order_payload: dict) -> dict:
  return {
    "appId": app_id,
    "orderId": order_payload["order_id"],
    "paymentSessionId": order_payload.get("payment_session_id", ""),
    "amount": order_payload["order_amount"],
    "currency": order_payload["order_currency"],
    "name": "CYBERPUNK'26",
    "description": f"{event.event_name} registration",
    "prefill": {
      "name": lead_participant["fullName"].strip(),
      "email": normalize_email(lead_participant["email"]),
      "contact": normalize_mobile(lead_participant["mobileNumber"])
    }
  }


def create_payment_order(validated_data: dict) -> dict:
  event = validated_data["event"]
  lead_participant = validated_data["participants"][0]
  app_id, _ = _get_cashfree_credentials()
  expected_amount = amount_to_subunits(validated_data["total_amount"])
  payload_hash = build_payment_payload_fingerprint(validated_data)
  expected_order_id = build_order_id(event.event_code, validated_data["idempotencyKey"], payload_hash)

  existing_attempt = (
    PaymentAttempt.objects.filter(
      idempotency_key=validated_data["idempotencyKey"],
      payload_hash=payload_hash,
      status=PaymentAttempt.STATUS_CREATED
    )
    .order_by("-created_at")
    .first()
  )
  if existing_attempt:
    return _build_payment_order_response(
      app_id,
      event,
      lead_participant,
      {
        "order_id": existing_attempt.order_id,
        "order_amount": existing_attempt.amount / 100,
        "order_currency": existing_attempt.currency
      }
    )

  customer_phone = normalize_mobile(lead_participant["mobileNumber"]).lstrip("+")
  customer_email = normalize_email(lead_participant["email"])
  customer_name = lead_participant["fullName"].strip()
  customer_id = f"cp26-{validated_data['idempotencyKey'][:16]}"

  order_payload = _cashfree_request(
    "POST",
    "/orders",
    {
      "order_amount": float(Decimal(str(event.registration_fee * validated_data["teamSize"])) if event.registration_fee_type != Event.FEE_TYPE_PER_TEAM else event.registration_fee),
      "order_currency": "INR",
      "order_id": expected_order_id,
      "customer_details": {
        "customer_id": customer_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone
      },
      "order_meta": {
        "return_url": getattr(settings, "CASHFREE_RETURN_URL", "https://example.com/registration-complete?order_id={order_id}"),
        "notify_url": getattr(settings, "CASHFREE_WEBHOOK_URL", "")
      },
      "order_note": f"CYBERPUNK'26 - {event.event_name} registration",
      "order_tags": {
        "event_code": event.event_code,
        "idempotency_key": validated_data["idempotencyKey"],
        "payload_hash": payload_hash,
        "team_name": validated_data.get("teamName") or "Solo entry",
        "team_size": str(validated_data["teamSize"])
      }
    }
  )

  required_order_fields = {"order_id", "order_amount", "order_currency", "payment_session_id"}
  if not required_order_fields.issubset(order_payload):
    raise PaymentGatewayError("Cashfree order response was missing required fields.")
  if float(order_payload.get("order_amount", 0)) * 100 != expected_amount:
    raise PaymentGatewayError("Cashfree order amount did not match the registration fee.")
  if order_payload.get("order_currency") != "INR":
    raise PaymentGatewayError("Cashfree order currency did not match the registration currency.")

  PaymentAttempt.objects.update_or_create(
    order_id=order_payload["order_id"],
    defaults={
      "event": event,
      "idempotency_key": validated_data["idempotencyKey"],
      "receipt": expected_order_id,
      "payload_hash": payload_hash,
      "amount": expected_amount,
      "currency": "INR",
      "status": PaymentAttempt.STATUS_CREATED
    }
  )

  return _build_payment_order_response(app_id, event, lead_participant, order_payload)


def verify_webhook_signature(timestamp: str, raw_body: str, signature: str) -> bool:
  """Verify Cashfree webhook signature using HMAC-SHA256."""
  _, secret_key = _get_cashfree_credentials()
  sign_str = timestamp + raw_body
  expected_signature = b64encode(
    hmac.new(secret_key.encode("utf-8"), sign_str.encode("utf-8"), hashlib.sha256).digest()
  ).decode("utf-8")
  return hmac.compare_digest(expected_signature, signature)


def fetch_order(order_id: str) -> dict:
  return _cashfree_request("GET", f"/orders/{order_id}")


def fetch_order_payments(order_id: str) -> list:
  return _cashfree_request("GET", f"/orders/{order_id}/payments")


def _as_notes_dict(value) -> dict:
  return value if isinstance(value, dict) else {}


def _validate_cashfree_order_tags(order_tags: dict, validated_data: dict, source: str) -> None:
  event_code = str(order_tags.get("event_code") or "").strip().upper()
  idempotency_key = str(order_tags.get("idempotency_key") or "").strip()
  payload_hash = str(order_tags.get("payload_hash") or "").strip()
  team_size = str(order_tags.get("team_size") or "").strip()

  if not event_code:
    raise PaymentVerificationError(f"Cashfree {source} tags are missing the event code.")
  if not idempotency_key:
    raise PaymentVerificationError(f"Cashfree {source} tags are missing the request key.")
  if not payload_hash:
    raise PaymentVerificationError(f"Cashfree {source} tags are missing the payload fingerprint.")
  if not team_size:
    raise PaymentVerificationError(f"Cashfree {source} tags are missing the team size.")

  if event_code != validated_data["event"].event_code:
    raise PaymentVerificationError(f"Cashfree {source} tags do not match the selected event.")
  if idempotency_key != validated_data["idempotencyKey"]:
    raise PaymentVerificationError(f"Cashfree {source} tags do not match this request.")
  expected_payload_hash = build_payment_payload_fingerprint(validated_data)
  if not hmac.compare_digest(payload_hash, expected_payload_hash):
    raise PaymentVerificationError(f"Cashfree {source} tags do not match the submitted registration details.")
  if team_size != str(validated_data["teamSize"]):
    raise PaymentVerificationError(f"Cashfree {source} tags do not match the submitted team size.")


def _get_verified_payment_attempt(order_id: str, validated_data: dict, expected_amount: int) -> PaymentAttempt:
  try:
    payment_attempt = PaymentAttempt.objects.select_related("event").get(order_id=order_id)
  except PaymentAttempt.DoesNotExist as exc:
    raise PaymentVerificationError("Start payment from this registration form before submitting.") from exc

  expected_payload_hash = build_payment_payload_fingerprint(validated_data)
  if payment_attempt.event_id != validated_data["event"].id:
    raise PaymentVerificationError("Stored Cashfree order event does not match this registration.")
  if payment_attempt.idempotency_key != validated_data["idempotencyKey"]:
    raise PaymentVerificationError("Stored Cashfree order request key does not match this registration.")
  if not hmac.compare_digest(payment_attempt.payload_hash, expected_payload_hash):
    raise PaymentVerificationError("Stored Cashfree order details do not match this registration.")
  if payment_attempt.amount != expected_amount:
    raise PaymentVerificationError("Stored Cashfree order amount does not match this registration.")
  if payment_attempt.currency != "INR":
    raise PaymentVerificationError("Stored Cashfree order currency does not match this registration.")

  return payment_attempt


def resolve_verified_payment(validated_data: dict) -> dict:
  order_id = validated_data["cashfreeOrderId"].strip()
  expected_amount = amount_to_subunits(validated_data["total_amount"])
  payment_attempt = _get_verified_payment_attempt(order_id, validated_data, expected_amount)

  order = fetch_order(order_id)

  if order.get("order_id") != order_id:
    raise PaymentVerificationError("Cashfree order ID could not be verified.")

  order_amount_cents = int(float(order.get("order_amount", 0)) * 100)
  if order_amount_cents != expected_amount:
    raise PaymentVerificationError("Cashfree order amount does not match the registration fee.")
  if order.get("order_currency") != "INR":
    raise PaymentVerificationError("Cashfree order currency does not match the registration currency.")

  order_tags = _as_notes_dict(order.get("order_tags"))
  if order_tags:
    _validate_cashfree_order_tags(order_tags, validated_data, "order")

  order_status = order.get("order_status")
  if order_status == "EXPIRED":
    raise PaymentVerificationError("Cashfree order has expired.")
  if order_status == "TERMINATED":
    raise PaymentVerificationError("Cashfree order was terminated.")

  payments = fetch_order_payments(order_id)
  if not payments:
    raise PaymentVerificationError("No payment was found for this Cashfree order.")

  payment = payments[0] if isinstance(payments, list) else payments
  cf_payment_id = payment.get("cf_payment_id", "")
  payment_status = payment.get("payment_status")

  if payment_status not in {"SUCCESS", "CAPTURED"}:
    raise PaymentVerificationError("Cashfree has not confirmed this payment yet.")

  payment_date = timezone.localdate()
  created_at = payment.get("payment_time") or payment.get("payment_completion_time")
  if created_at:
    try:
      if isinstance(created_at, str):
        payment_date = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date()
      elif isinstance(created_at, (int, float)):
        payment_date = datetime.fromtimestamp(created_at, tz=timezone.get_current_timezone()).date()
    except (ValueError, TypeError, OSError):
      pass

  resolved_status = Registration.PAYMENT_VERIFIED
  if payment_status == "AUTHORIZED":
    resolved_status = Registration.PAYMENT_PENDING

  payment_attempt.payment_id = cf_payment_id
  payment_attempt.status = PaymentAttempt.STATUS_CAPTURED
  payment_attempt.save(update_fields=["payment_id", "status", "updated_at"])

  return {
    "normalized_transaction_id": cf_payment_id,
    "payment_provider": Registration.PAYMENT_PROVIDER_CASHFREE,
    "payment_order_id": order_id,
    "payment_session_id": "",
    "payment_signature": "",
    "payment_date": payment_date,
    "payment_status": resolved_status,
    "payment_screenshot_path": ""
  }


def check_order_status(order_id: str) -> dict:
  """Check order status without full verification - used for frontend polling."""
  order = fetch_order(order_id)
  order_status = order.get("order_status", "")
  payments = fetch_order_payments(order_id)

  cf_payment_id = ""
  payment_status = ""
  if payments:
    payment = payments[0] if isinstance(payments, list) else payments
    cf_payment_id = payment.get("cf_payment_id", "")
    payment_status = payment.get("payment_status", "")

  return {
    "orderId": order_id,
    "orderStatus": order_status,
    "paymentStatus": payment_status,
    "paymentId": cf_payment_id
  }


def resolve_upload_token(upload_token: str) -> str:
  try:
    storage_path = UPLOAD_SIGNER.unsign(upload_token)
  except BadSignature as exc:
    raise ValueError("Invalid upload token.") from exc

  if not storage_path.startswith("payments/"):
    raise ValueError("Invalid upload token path.")

  return storage_path


def ensure_duplicate_rules(
  event: Event,
  participants: list[dict],
  transaction_id: str | None = None,
  payment_order_id: str | None = None,
  team_name: str | None = None
) -> None:
  if transaction_id and Registration.objects.filter(transaction_id=transaction_id).exists():
    raise DuplicateRegistrationError("This payment reference is already in use.")
  if payment_order_id and Registration.objects.filter(payment_order_id=payment_order_id).exists():
    raise DuplicateRegistrationError("This Cashfree order has already been used.")

  if team_name and Registration.objects.filter(event=event, team_name__iexact=team_name).exists():
    raise DuplicateRegistrationError("A team with this name is already registered for this event.")

  for participant in participants:
    email = normalize_email(participant["email"])
    mobile = normalize_mobile(participant["mobileNumber"])

    if Participant.objects.filter(email=email).exists():
      raise DuplicateRegistrationError("A participant email is already registered.")
    if Participant.objects.filter(mobile_number=mobile).exists():
      raise DuplicateRegistrationError("A participant mobile number is already registered.")


@transaction.atomic
def create_registration(validated_data: dict) -> Registration:
  existing_registration = Registration.objects.select_for_update().filter(
    idempotency_key=validated_data["idempotencyKey"]
  ).first()
  if existing_registration:
    return existing_registration

  event = Event.objects.select_for_update().get(pk=validated_data["event"].pk)
  ensure_duplicate_rules(
    event,
    validated_data["participants"],
    validated_data["normalized_transaction_id"],
    validated_data.get("payment_order_id"),
    team_name=validated_data.get("teamName")
  )

  latest = Registration.objects.select_for_update().filter(event=event).order_by("-id").first()
  next_number = 1
  if latest:
    try:
      next_number = int(latest.registration_code.split("-")[-1]) + 1
    except ValueError:
      next_number = latest.id + 1

  try:
    registration = Registration.objects.create(
      registration_code=f"CP26-{event.event_code}-{next_number:04d}",
      event=event,
      team_name=validated_data.get("teamName") or None,
      team_size=validated_data["teamSize"],
      total_amount=validated_data["total_amount"],
      transaction_id=validated_data["normalized_transaction_id"],
      payment_provider=validated_data.get("payment_provider", Registration.PAYMENT_PROVIDER_MANUAL),
      payment_order_id=validated_data.get("payment_order_id", ""),
      payment_session_id=validated_data.get("payment_session_id", ""),
      payment_signature=validated_data.get("payment_signature", ""),
      payment_date=validated_data["payment_date"],
      payment_screenshot_path=validated_data.get("payment_screenshot_path", ""),
      payment_status=validated_data.get("payment_status", Registration.PAYMENT_PENDING),
      idempotency_key=validated_data["idempotencyKey"] or uuid4().hex,
      consent_given=validated_data["consentGiven"]
    )
  except IntegrityError as exc:
    raise DuplicateRegistrationError("This payment or registration request has already been used.") from exc

  participant_rows = []
  for index, participant in enumerate(validated_data["participants"], start=1):
    participant_rows.append(Participant(
      registration=registration,
      participant_number=index,
      full_name=participant["fullName"].strip(),
      college_name=participant["collegeName"].strip(),
      roll_number="",
      mobile_number=normalize_mobile(participant["mobileNumber"]),
      email=normalize_email(participant["email"]),
      department=participant["department"].strip(),
      year_of_study=participant["yearOfStudy"].strip(),
      food_preference=participant["foodPreference"],
      is_team_leader=participant["isTeamLeader"]
    ))

  Participant.objects.bulk_create(participant_rows)
  return registration
