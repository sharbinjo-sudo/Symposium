from decimal import Decimal
import re
from uuid import uuid4

from django.core.signing import BadSignature, Signer
from django.db import IntegrityError, transaction

from events.models import Event

from .models import Participant, Registration

UPLOAD_SIGNER = Signer(salt="payment-proof")


class DuplicateRegistrationError(Exception):
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
  team_name: str | None = None
) -> None:
  if transaction_id and Registration.objects.filter(transaction_id=transaction_id).exists():
    raise DuplicateRegistrationError("This payment reference is already in use.")

  active_registrations = Registration.objects.exclude(payment_status=Registration.PAYMENT_REJECTED)
  active_participants = Participant.objects.exclude(registration__payment_status=Registration.PAYMENT_REJECTED)

  if team_name and active_registrations.filter(event=event, team_name__iexact=team_name).exists():
    raise DuplicateRegistrationError("A team with this name is already registered for this event.")

  for participant in participants:
    email = normalize_email(participant["email"])
    mobile = normalize_mobile(participant["mobileNumber"])

    if active_participants.filter(email=email).exists():
      raise DuplicateRegistrationError("A participant email is already registered.")
    if active_participants.filter(mobile_number=mobile).exists():
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
