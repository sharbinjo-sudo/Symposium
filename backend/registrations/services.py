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
        "full_name": participant["fullName"].strip(),
        "is_team_leader": bool(participant["isTeamLeader"]),
        "mobile_number": normalize_mobile(participant["mobileNumber"]),
        "roll_number": participant["rollNumber"].strip(),
        "year_of_study": participant["yearOfStudy"].strip()
      }
      for participant in validated_data["participants"]
    ],
    "team_name": team_name,
    "team_size": validated_data["teamSize"]
  }
  fingerprint_payload = json.dumps(payload, separators=(",", ":"), sort_keys=True)
  return hashlib.sha256(fingerprint_payload.encode("utf-8")).hexdigest()


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


def build_order_receipt(event_code: str, idempotency_key: str, payload_hash: str = "", nonce: str = "") -> str:
  idempotency_part = idempotency_key.replace("-", "")[:12]
  hash_part = payload_hash[:8] if payload_hash else "00000000"
  nonce_part = nonce or uuid4().hex[:6]
  receipt = f"cp26-{event_code.lower()}-{idempotency_part}-{hash_part}-{nonce_part}"
  return receipt[:40]


def _build_payment_order_response(key_id: str, event: Event, lead_participant: dict, order_payload: dict) -> dict:
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


def create_payment_order(validated_data: dict) -> dict:
  event = validated_data["event"]
  lead_participant = validated_data["participants"][0]
  key_id, _ = _get_razorpay_credentials()
  expected_amount = amount_to_subunits(validated_data["total_amount"])
  payload_hash = build_payment_payload_fingerprint(validated_data)
  expected_receipt = build_order_receipt(event.event_code, validated_data["idempotencyKey"], payload_hash)
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
      key_id,
      event,
      lead_participant,
      {
        "id": existing_attempt.order_id,
        "amount": existing_attempt.amount,
        "currency": existing_attempt.currency
      }
    )

  order_payload = _razorpay_request(
    "POST",
    "/orders",
    {
      "amount": expected_amount,
      "currency": "INR",
      "receipt": expected_receipt,
      "notes": {
        "event_code": event.event_code,
        "idempotency_key": validated_data["idempotencyKey"],
        "payload_hash": payload_hash,
        "team_name": validated_data.get("teamName") or "Solo entry",
        "team_size": str(validated_data["teamSize"])
      }
    }
  )

  required_order_fields = {"id", "amount", "currency"}
  if not required_order_fields.issubset(order_payload):
    raise PaymentGatewayError("Razorpay order response was missing required fields.")
  if order_payload.get("amount") != expected_amount:
    raise PaymentGatewayError("Razorpay order amount did not match the registration fee.")
  if order_payload.get("currency") != "INR":
    raise PaymentGatewayError("Razorpay order currency did not match the registration currency.")

  PaymentAttempt.objects.update_or_create(
    order_id=order_payload["id"],
    defaults={
      "event": event,
      "idempotency_key": validated_data["idempotencyKey"],
      "receipt": expected_receipt,
      "payload_hash": payload_hash,
      "amount": expected_amount,
      "currency": "INR",
      "status": PaymentAttempt.STATUS_CREATED
    }
  )

  return _build_payment_order_response(key_id, event, lead_participant, order_payload)


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> None:
  _, key_secret = _get_razorpay_credentials()
  payload = f"{order_id}|{payment_id}".encode("utf-8")
  expected_signature = hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

  if not hmac.compare_digest(expected_signature, signature):
    raise PaymentVerificationError("Payment signature verification failed.")


def fetch_payment(payment_id: str) -> dict:
  return _razorpay_request("GET", f"/payments/{payment_id}")


def fetch_order(order_id: str) -> dict:
  return _razorpay_request("GET", f"/orders/{order_id}")


def _as_notes_dict(value) -> dict:
  return value if isinstance(value, dict) else {}


def _validate_razorpay_notes(notes: dict, validated_data: dict, source: str, required: bool = True) -> None:
  event_code = str(notes.get("event_code") or "").strip().upper()
  idempotency_key = str(notes.get("idempotency_key") or "").strip()
  payload_hash = str(notes.get("payload_hash") or "").strip()
  team_size = str(notes.get("team_size") or "").strip()

  if required and not event_code:
    raise PaymentVerificationError(f"Razorpay {source} notes are missing the event code.")
  if required and not idempotency_key:
    raise PaymentVerificationError(f"Razorpay {source} notes are missing the request key.")
  if required and not payload_hash:
    raise PaymentVerificationError(f"Razorpay {source} notes are missing the payload fingerprint.")
  if required and not team_size:
    raise PaymentVerificationError(f"Razorpay {source} notes are missing the team size.")

  if event_code and event_code != validated_data["event"].event_code:
    raise PaymentVerificationError(f"Razorpay {source} notes do not match the selected event.")
  if idempotency_key and idempotency_key != validated_data["idempotencyKey"]:
    raise PaymentVerificationError(f"Razorpay {source} notes do not match this request.")
  expected_payload_hash = build_payment_payload_fingerprint(validated_data)
  if payload_hash and not hmac.compare_digest(payload_hash, expected_payload_hash):
    raise PaymentVerificationError(f"Razorpay {source} notes do not match the submitted registration details.")
  if team_size and team_size != str(validated_data["teamSize"]):
    raise PaymentVerificationError(f"Razorpay {source} notes do not match the submitted team size.")


def _get_verified_payment_attempt(order_id: str, validated_data: dict, expected_amount: int) -> PaymentAttempt:
  try:
    payment_attempt = PaymentAttempt.objects.select_related("event").get(order_id=order_id)
  except PaymentAttempt.DoesNotExist as exc:
    raise PaymentVerificationError("Start payment from this registration form before submitting.") from exc

  expected_payload_hash = build_payment_payload_fingerprint(validated_data)
  if payment_attempt.event_id != validated_data["event"].id:
    raise PaymentVerificationError("Stored Razorpay order event does not match this registration.")
  if payment_attempt.idempotency_key != validated_data["idempotencyKey"]:
    raise PaymentVerificationError("Stored Razorpay order request key does not match this registration.")
  if not hmac.compare_digest(payment_attempt.payload_hash, expected_payload_hash):
    raise PaymentVerificationError("Stored Razorpay order details do not match this registration.")
  if payment_attempt.amount != expected_amount:
    raise PaymentVerificationError("Stored Razorpay order amount does not match this registration.")
  if payment_attempt.currency != "INR":
    raise PaymentVerificationError("Stored Razorpay order currency does not match this registration.")

  return payment_attempt


def resolve_verified_payment(validated_data: dict) -> dict:
  order_id = validated_data["razorpayOrderId"].strip()
  payment_id = normalize_transaction_id(validated_data["razorpayPaymentId"])
  signature = validated_data["razorpaySignature"].strip()
  expected_amount = amount_to_subunits(validated_data["total_amount"])
  payment_attempt = _get_verified_payment_attempt(order_id, validated_data, expected_amount)

  verify_payment_signature(order_id, payment_id, signature)
  order = fetch_order(order_id)
  payment = fetch_payment(payment_id)

  if order.get("id") != order_id:
    raise PaymentVerificationError("Razorpay order ID could not be verified.")

  if order.get("amount") != expected_amount:
    raise PaymentVerificationError("Razorpay order amount does not match the registration fee.")

  if order.get("currency") != "INR":
    raise PaymentVerificationError("Razorpay order currency does not match the registration currency.")

  if order.get("receipt") != payment_attempt.receipt:
    raise PaymentVerificationError("Razorpay order receipt does not match the stored payment attempt.")

  _validate_razorpay_notes(_as_notes_dict(order.get("notes")), validated_data, "order")

  if payment.get("order_id") != order_id:
    raise PaymentVerificationError("Razorpay order and payment IDs do not match.")

  if payment.get("amount") != expected_amount:
    raise PaymentVerificationError("Razorpay amount does not match the registration fee.")

  if payment.get("currency") != "INR":
    raise PaymentVerificationError("Razorpay currency does not match the registration currency.")

  payment_notes = _as_notes_dict(payment.get("notes"))
  if payment_notes:
    _validate_razorpay_notes(payment_notes, validated_data, "payment", required=False)

  payment_status = payment.get("status")
  if payment_status not in {"authorized", "captured"}:
    payment_attempt.payment_id = payment_id
    payment_attempt.status = PaymentAttempt.STATUS_FAILED
    payment_attempt.save(update_fields=["payment_id", "status", "updated_at"])
    raise PaymentVerificationError("Razorpay has not confirmed this payment yet.")

  created_at = payment.get("created_at")
  payment_date = timezone.localdate()
  if isinstance(created_at, int):
    payment_date = datetime.fromtimestamp(created_at, tz=timezone.get_current_timezone()).date()

  resolved_status = Registration.PAYMENT_VERIFIED
  if payment_status == "authorized":
    resolved_status = Registration.PAYMENT_PENDING

  payment_attempt.payment_id = payment_id
  payment_attempt.status = (
    PaymentAttempt.STATUS_CAPTURED if payment_status == "captured" else PaymentAttempt.STATUS_AUTHORIZED
  )
  payment_attempt.save(update_fields=["payment_id", "status", "updated_at"])

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
  if transaction_id and Registration.objects.filter(transaction_id=transaction_id).exists():
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
