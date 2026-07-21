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
from django.db import transaction
from django.utils import timezone

from events.models import Event

from .models import Participant, Registration

UPLOAD_SIGNER = Signer(salt="payment-proof")


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


def _get_razorpay_credentials() -> tuple[str, str]:
  key_id = settings.RAZORPAY_KEY_ID.strip()
  key_secret = settings.RAZORPAY_KEY_SECRET.strip()

  if not key_id or not key_secret:
    raise PaymentConfigurationError("Razorpay keys are not configured on the server.")

  return key_id, key_secret


def _razorpay_request(method: str, path: str, payload: dict | None = None) -> dict:
  key_id, key_secret = _get_razorpay_credentials()
  data = json.dumps(payload).encode("utf-8") if payload is not None else None
  auth_token = b64encode(f"{key_id}:{key_secret}".encode("utf-8")).decode("utf-8")
  headers = {
    "Authorization": f"Basic {auth_token}",
    "Accept": "application/json"
  }

  if payload is not None:
    headers["Content-Type"] = "application/json"

  req = request.Request(
    url=f"https://api.razorpay.com/v1{path}",
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
        error_payload.get("error", {}).get("description")
        or error_payload.get("error", {}).get("reason")
        or error_body
      )
    except Exception:
      message = f"Razorpay rejected the request with status {exc.code}."
    raise PaymentGatewayError(message) from exc
  except URLError as exc:
    raise PaymentGatewayError("Unable to reach Razorpay right now. Please try again shortly.") from exc

  try:
    return json.loads(body)
  except json.JSONDecodeError as exc:
    raise PaymentGatewayError("Razorpay returned an unexpected response.") from exc


def build_order_receipt(event_code: str, idempotency_key: str) -> str:
  receipt = f"cp26-{event_code.lower()}-{idempotency_key.replace('-', '')[:28]}"
  return receipt[:40]


def create_payment_order(validated_data: dict) -> dict:
  event = validated_data["event"]
  lead_participant = validated_data["participants"][0]
  key_id, _ = _get_razorpay_credentials()
  order_payload = _razorpay_request(
    "POST",
    "/orders",
    {
      "amount": amount_to_subunits(validated_data["total_amount"]),
      "currency": "INR",
      "receipt": build_order_receipt(event.event_code, validated_data["idempotencyKey"]),
      "notes": {
        "event_code": event.event_code,
        "team_name": validated_data.get("teamName") or "Solo entry",
        "team_size": str(validated_data["teamSize"])
      }
    }
  )

  return {
    "keyId": key_id,
    "orderId": order_payload["id"],
    "amount": order_payload["amount"],
    "currency": order_payload["currency"],
    "name": "CYBERPUNK'26",
    "description": f"{event.event_name} registration",
    "prefill": {
      "name": lead_participant["fullName"].strip(),
      "email": normalize_email(lead_participant["email"]),
      "contact": normalize_mobile(lead_participant["mobileNumber"])
    }
  }


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> None:
  _, key_secret = _get_razorpay_credentials()
  payload = f"{order_id}|{payment_id}".encode("utf-8")
  expected_signature = hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

  if not hmac.compare_digest(expected_signature, signature):
    raise PaymentVerificationError("Payment signature verification failed.")


def fetch_payment(payment_id: str) -> dict:
  return _razorpay_request("GET", f"/payments/{payment_id}")


def resolve_verified_payment(validated_data: dict) -> dict:
  order_id = validated_data["razorpayOrderId"].strip()
  payment_id = normalize_transaction_id(validated_data["razorpayPaymentId"])
  signature = validated_data["razorpaySignature"].strip()

  verify_payment_signature(order_id, payment_id, signature)
  payment = fetch_payment(payment_id)

  if payment.get("order_id") != order_id:
    raise PaymentVerificationError("Razorpay order and payment IDs do not match.")

  if payment.get("amount") != amount_to_subunits(validated_data["total_amount"]):
    raise PaymentVerificationError("Razorpay amount does not match the registration fee.")

  if payment.get("currency") != "INR":
    raise PaymentVerificationError("Razorpay currency does not match the registration currency.")

  payment_notes = payment.get("notes") or {}
  note_event_code = str(payment_notes.get("event_code") or "").strip().upper()
  note_team_size = str(payment_notes.get("team_size") or "").strip()

  if note_event_code and note_event_code != validated_data["event"].event_code:
    raise PaymentVerificationError("Razorpay payment notes do not match the selected event.")
  if note_team_size and note_team_size != str(validated_data["teamSize"]):
    raise PaymentVerificationError("Razorpay payment notes do not match the submitted team size.")

  payment_status = payment.get("status")
  if payment_status not in {"authorized", "captured"}:
    raise PaymentVerificationError("Razorpay has not confirmed this payment yet.")

  created_at = payment.get("created_at")
  payment_date = timezone.localdate()
  if isinstance(created_at, int):
    payment_date = datetime.fromtimestamp(created_at, tz=timezone.get_current_timezone()).date()

  resolved_status = Registration.PAYMENT_VERIFIED
  if payment_status == "authorized":
    resolved_status = Registration.PAYMENT_PENDING

  return {
    "normalized_transaction_id": payment_id,
    "payment_provider": Registration.PAYMENT_PROVIDER_RAZORPAY,
    "payment_order_id": order_id,
    "payment_signature": signature,
    "payment_date": payment_date,
    "payment_status": resolved_status,
    "payment_screenshot_path": ""
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
  payment_order_id: str | None = None
) -> None:
  if transaction_id and Registration.objects.filter(event=event, transaction_id=transaction_id).exists():
    raise DuplicateRegistrationError("This payment reference is already in use.")
  if payment_order_id and Registration.objects.filter(payment_order_id=payment_order_id).exists():
    raise DuplicateRegistrationError("This Razorpay order has already been used.")

  for participant in participants:
    email = normalize_email(participant["email"])
    mobile = normalize_mobile(participant["mobileNumber"])
    roll_number = participant["rollNumber"].strip()

    if Participant.objects.filter(registration__event=event, email=email).exists():
      raise DuplicateRegistrationError("A participant email is already registered for this event.")
    if Participant.objects.filter(registration__event=event, mobile_number=mobile).exists():
      raise DuplicateRegistrationError("A participant mobile number is already registered for this event.")
    if Participant.objects.filter(registration__event=event, roll_number=roll_number).exists():
      raise DuplicateRegistrationError("A participant roll number is already registered for this event.")


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
    validated_data.get("payment_order_id")
  )

  latest = Registration.objects.select_for_update().filter(event=event).order_by("-id").first()
  next_number = 1
  if latest:
    try:
      next_number = int(latest.registration_code.split("-")[-1]) + 1
    except ValueError:
      next_number = latest.id + 1

  registration = Registration.objects.create(
    registration_code=f"CP26-{event.event_code}-{next_number:04d}",
    event=event,
    team_name=validated_data.get("teamName") or None,
    team_size=validated_data["teamSize"],
    total_amount=validated_data["total_amount"],
    transaction_id=validated_data["normalized_transaction_id"],
    payment_provider=validated_data.get("payment_provider", Registration.PAYMENT_PROVIDER_MANUAL),
    payment_order_id=validated_data.get("payment_order_id", ""),
    payment_signature=validated_data.get("payment_signature", ""),
    payment_date=validated_data["payment_date"],
    payment_screenshot_path=validated_data.get("payment_screenshot_path", ""),
    payment_status=validated_data.get("payment_status", Registration.PAYMENT_PENDING),
    idempotency_key=validated_data["idempotencyKey"] or uuid4().hex,
    consent_given=validated_data["consentGiven"]
  )

  participant_rows = []
  for index, participant in enumerate(validated_data["participants"], start=1):
    participant_rows.append(
      Participant(
        registration=registration,
        participant_number=index,
        full_name=participant["fullName"].strip(),
        college_name=participant["collegeName"].strip(),
        roll_number=participant["rollNumber"].strip(),
        mobile_number=normalize_mobile(participant["mobileNumber"]),
        email=normalize_email(participant["email"]),
        department=participant["department"].strip(),
        year_of_study=participant["yearOfStudy"].strip(),
        is_team_leader=participant["isTeamLeader"]
      )
    )

  Participant.objects.bulk_create(participant_rows)
  return registration
