from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.utils import timezone
from rest_framework import serializers
import re

from events.models import Event

from .models import Participant, Registration
from .services import normalize_transaction_id, resolve_upload_token, selected_events_for_registration
from events.serializers import EVENT_CONTENT

FULL_NAME_ERROR = "Enter a valid name without numbers, phone numbers, or email addresses."
INDIAN_MOBILE_ERROR = "Enter a valid Indian mobile number, like +91XXXXXXXXXX."


def _split_events_by_track(events):
  """Split a list of Event objects into technical and non-technical lists."""
  technical = []
  non_technical = []
  for event in events:
    track = getattr(event, "track", None)
    if not track:
      content = EVENT_CONTENT.get(event.event_code, {})
      track = content.get("track", "Technical")
    if track == "Non-Technical":
      non_technical.append(event)
    else:
      technical.append(event)
  return technical, non_technical


class ParticipantInputSerializer(serializers.Serializer):
  fullName = serializers.CharField(max_length=150)
  collegeName = serializers.CharField(max_length=200)
  rollNumber = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
  mobileNumber = serializers.CharField(max_length=16)
  email = serializers.CharField(max_length=254)
  department = serializers.CharField(max_length=100)
  yearOfStudy = serializers.CharField(max_length=20)
  foodPreference = serializers.ChoiceField(choices=Participant.FOOD_PREFERENCE_CHOICES)

  def validate_fullName(self, value: str) -> str:
    trimmed_value = value.strip()

    if len(trimmed_value) < 2:
      raise serializers.ValidationError("Full name is required.")
    if "@" in trimmed_value:
      raise serializers.ValidationError(FULL_NAME_ERROR)
    if any(character.isdigit() for character in trimmed_value):
      raise serializers.ValidationError(FULL_NAME_ERROR)

    allowed_punctuation = {" ", ".", "'", "-"}
    if not all(character.isalpha() or character in allowed_punctuation for character in trimmed_value):
      raise serializers.ValidationError(FULL_NAME_ERROR)

    parts = [part for part in trimmed_value.replace(".", " ").replace("-", " ").replace("'", " ").split() if part]
    if not parts or not all(part.isalpha() for part in parts):
      raise serializers.ValidationError(FULL_NAME_ERROR)

    return trimmed_value

  def validate_collegeName(self, value: str) -> str:
    trimmed_value = value.strip()
    if len(trimmed_value) < 2:
      raise serializers.ValidationError("College name is required.")
    return trimmed_value

  def validate_mobileNumber(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Mobile number is required.")
    compact_value = re.sub(r"[()\s-]+", "", trimmed_value)

    is_valid = False
    if compact_value.startswith("+91"):
      is_valid = bool(re.fullmatch(r"\+91[6-9]\d{9}", compact_value))
    elif compact_value.startswith("91") and len(compact_value) == 12:
      is_valid = bool(re.fullmatch(r"91[6-9]\d{9}", compact_value))
    elif len(compact_value) == 10:
      is_valid = bool(re.fullmatch(r"[6-9]\d{9}", compact_value))

    if not is_valid:
      raise serializers.ValidationError(INDIAN_MOBILE_ERROR)
    return trimmed_value

  def validate_email(self, value: str) -> str:
    trimmed_value = value.strip().lower()
    if not trimmed_value:
      raise serializers.ValidationError("Email address is required.")
    try:
      validate_email(trimmed_value)
    except DjangoValidationError as exc:
      raise serializers.ValidationError("Enter a valid email address.") from exc
    return trimmed_value

  def validate_department(self, value: str) -> str:
    trimmed_value = value.strip()
    if len(trimmed_value) < 2:
      raise serializers.ValidationError("Department is required.")
    return trimmed_value

  def validate_yearOfStudy(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Year of study is required.")
    return trimmed_value


class RegistrationBaseSerializer(serializers.Serializer):
  eventCode = serializers.CharField(max_length=4, required=False, allow_blank=True)
  eventCodes = serializers.ListField(
    child=serializers.CharField(max_length=4),
    min_length=1,
    max_length=8,
    required=False
  )
  participants = ParticipantInputSerializer(many=True)
  idempotencyKey = serializers.CharField(max_length=64)

  def validate_eventCode(self, value: str) -> str:
    return value.strip().upper()

  def validate_eventCodes(self, value: list[str]) -> list[str]:
    normalized_codes: list[str] = []
    for code in value:
      normalized_code = code.strip().upper()
      if normalized_code and normalized_code not in normalized_codes:
        normalized_codes.append(normalized_code)
    if not normalized_codes:
      raise serializers.ValidationError("Choose at least one event.")
    return normalized_codes

  def validate_idempotencyKey(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Request key is required.")
    return trimmed_value

  def validate(self, attrs):
    selected_event_codes = attrs.get("eventCodes") or []
    legacy_event_code = attrs.get("eventCode", "")
    if legacy_event_code and legacy_event_code not in selected_event_codes:
      selected_event_codes = [legacy_event_code, *selected_event_codes]

    selected_event_codes = list(dict.fromkeys(selected_event_codes))
    if not selected_event_codes:
      raise serializers.ValidationError({"eventCodes": "Choose at least one event."})

    events_by_code = Event.objects.in_bulk(selected_event_codes, field_name="event_code")
    missing_codes = [code for code in selected_event_codes if code not in events_by_code]
    if missing_codes:
      raise serializers.ValidationError({"eventCodes": "One or more selected events do not exist."})

    selected_events = [events_by_code[code] for code in selected_event_codes]
    event = selected_events[0]

    if any(not selected_event.is_registration_open for selected_event in selected_events):
      raise serializers.ValidationError({"eventCodes": "Registration is closed for one or more selected events."})

    selected_code_set = set(selected_event_codes)
    if {"WC", "VS"}.issubset(selected_code_set):
      raise serializers.ValidationError(
        {
          "eventCodes": (
            "Choose either Web Craft or Visualytics, not both, due to the event schedule. "
            "Check Timeline page for more details."
          )
        }
      )

    participants = attrs["participants"]

    if len(participants) != 1:
      raise serializers.ValidationError({"participants": "Only one participant is allowed per registration."})

    attrs["eventCode"] = event.event_code
    attrs["eventCodes"] = selected_event_codes
    attrs["event"] = event
    attrs["selected_events"] = selected_events
    attrs["total_amount"] = event.registration_fee
    return attrs


class RegistrationSubmitSerializer(RegistrationBaseSerializer):
  transactionId = serializers.CharField(max_length=100)
  paymentDate = serializers.DateField(required=False)
  paymentUploadToken = serializers.CharField(max_length=700)
  consentGiven = serializers.BooleanField()

  def validate_transactionId(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("UPI transaction ID is required.")
    if not re.fullmatch(r"\d{12}", trimmed_value):
      raise serializers.ValidationError("Enter the 12-digit UPI transaction ID.")
    return trimmed_value

  def validate_paymentDate(self, value):
    if value > timezone.localdate():
      raise serializers.ValidationError("Payment date cannot be in the future.")
    return value

  def validate_paymentUploadToken(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Payment screenshot is required.")

    try:
      return resolve_upload_token(trimmed_value)
    except ValueError as exc:
      raise serializers.ValidationError(str(exc)) from exc

  def validate(self, attrs):
    attrs = super().validate(attrs)

    if not attrs["consentGiven"]:
      raise serializers.ValidationError({"consentGiven": "Consent is required."})

    attrs["normalized_transaction_id"] = normalize_transaction_id(attrs["transactionId"])
    attrs["payment_provider"] = Registration.PAYMENT_PROVIDER_MANUAL
    attrs["payment_date"] = attrs.get("paymentDate") or timezone.localdate()
    attrs["payment_screenshot_path"] = attrs["paymentUploadToken"]
    attrs["payment_status"] = Registration.PAYMENT_PENDING

    return attrs


class PrecheckParticipantSerializer(serializers.Serializer):
  email = serializers.EmailField(max_length=254, required=False, allow_blank=True)
  mobileNumber = serializers.CharField(max_length=16, required=False, allow_blank=True)

  def validate_email(self, value: str) -> str:
    return value.strip().lower()

  def validate_mobileNumber(self, value: str) -> str:
    return value.strip()


class RegistrationPrecheckSerializer(serializers.Serializer):
  eventCode = serializers.CharField(max_length=4, required=False, allow_blank=True)
  eventCodes = serializers.ListField(
    child=serializers.CharField(max_length=4),
    min_length=1,
    max_length=8,
    required=False
  )
  transactionId = serializers.CharField(max_length=100, required=False, allow_blank=True)
  participants = PrecheckParticipantSerializer(many=True, required=False)

  def validate_eventCode(self, value: str) -> str:
    return value.strip().upper()

  def validate_eventCodes(self, value: list[str]) -> list[str]:
    normalized_codes: list[str] = []
    for code in value:
      normalized_code = code.strip().upper()
      if normalized_code and normalized_code not in normalized_codes:
        normalized_codes.append(normalized_code)
    return normalized_codes

  def validate_transactionId(self, value: str) -> str:
    trimmed_value = value.strip()
    if trimmed_value and not re.fullmatch(r"\d{12}", trimmed_value):
      raise serializers.ValidationError("Enter the 12-digit UPI transaction ID.")
    return trimmed_value


class RegistrationStatusLookupSerializer(serializers.Serializer):
  registrationCode = serializers.CharField(max_length=20)
  email = serializers.EmailField(max_length=254)

  def validate_registrationCode(self, value: str) -> str:
    normalized_value = value.strip().upper()

    if not normalized_value:
      raise serializers.ValidationError("Registration code is required.")

    if not re.fullmatch(r"[A-Z0-9-]+", normalized_value):
      raise serializers.ValidationError("Enter a valid registration code.")

    return normalized_value

  def validate_email(self, value: str) -> str:
    return value.strip().lower()


class AdminRegistrationCreateSerializer(RegistrationBaseSerializer):
  transactionId = serializers.CharField(max_length=100)
  paymentProvider = serializers.ChoiceField(
    choices=Registration.PAYMENT_PROVIDER_CHOICES,
    required=False,
    default=Registration.PAYMENT_PROVIDER_MANUAL
  )
  paymentStatus = serializers.ChoiceField(
    choices=Registration.PAYMENT_STATUS_CHOICES,
    required=False,
    default=Registration.PAYMENT_VERIFIED
  )
  paymentDate = serializers.DateField()
  adminNote = serializers.CharField(required=False, allow_blank=True, max_length=1000)
  sendEmail = serializers.BooleanField(required=False, default=False)

  def validate_transactionId(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("UPI transaction ID is required.")
    if not re.fullmatch(r"\d{12}", trimmed_value):
      raise serializers.ValidationError("Enter the 12-digit UPI transaction ID.")
    return trimmed_value

  def validate_paymentProvider(self, value: str) -> str:
    return value

  def validate_paymentDate(self, value):
    if value > timezone.localdate():
      raise serializers.ValidationError("Payment date cannot be in the future.")
    return value


class RegistrationResponseSerializer(serializers.ModelSerializer):
  registrationCode = serializers.CharField(source="registration_code")
  eventCode = serializers.CharField(source="event.event_code")
  eventName = serializers.SerializerMethodField()
  eventCodes = serializers.SerializerMethodField()
  eventNames = serializers.SerializerMethodField()
  technicalEventCodes = serializers.SerializerMethodField()
  technicalEventNames = serializers.SerializerMethodField()
  nonTechnicalEventCodes = serializers.SerializerMethodField()
  nonTechnicalEventNames = serializers.SerializerMethodField()
  paymentStatus = serializers.CharField(source="payment_status")
  emailStatus = serializers.CharField(source="email_status")
  paymentReference = serializers.CharField(source="transaction_id")
  paymentDate = serializers.DateField(source="payment_date")
  paymentProvider = serializers.CharField(source="payment_provider")

  class Meta:
    model = Registration
    fields = [
      "registrationCode",
      "eventCode",
      "eventName",
      "eventCodes",
      "eventNames",
      "technicalEventCodes",
      "technicalEventNames",
      "nonTechnicalEventCodes",
      "nonTechnicalEventNames",
      "paymentStatus",
      "emailStatus",
      "paymentReference",
      "paymentDate",
      "paymentProvider"
    ]

  def get_eventName(self, obj):
    return ", ".join(event.event_name for event in selected_events_for_registration(obj))

  def get_eventCodes(self, obj):
    return [event.event_code for event in selected_events_for_registration(obj)]

  def get_eventNames(self, obj):
    return [event.event_name for event in selected_events_for_registration(obj)]

  def get_technicalEventCodes(self, obj):
    codes = getattr(obj, "technical_event_codes", None)
    if codes:
      return codes
    tech, _ = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_code for e in tech]

  def get_technicalEventNames(self, obj):
    codes = getattr(obj, "technical_event_codes", None)
    if codes:
      events_by_code = {e.event_code: e for e in selected_events_for_registration(obj)}
      return [events_by_code[c].event_name for c in codes if c in events_by_code]
    tech, _ = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_name for e in tech]

  def get_nonTechnicalEventCodes(self, obj):
    codes = getattr(obj, "non_technical_event_codes", None)
    if codes:
      return codes
    _, non_tech = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_code for e in non_tech]

  def get_nonTechnicalEventNames(self, obj):
    codes = getattr(obj, "non_technical_event_codes", None)
    if codes:
      events_by_code = {e.event_code: e for e in selected_events_for_registration(obj)}
      return [events_by_code[c].event_name for c in codes if c in events_by_code]
    _, non_tech = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_name for e in non_tech]


class RegistrationStatusResponseSerializer(serializers.ModelSerializer):
  registrationCode = serializers.CharField(source="registration_code")
  eventCode = serializers.CharField(source="event.event_code")
  eventName = serializers.SerializerMethodField()
  eventCodes = serializers.SerializerMethodField()
  eventNames = serializers.SerializerMethodField()
  technicalEventCodes = serializers.SerializerMethodField()
  technicalEventNames = serializers.SerializerMethodField()
  nonTechnicalEventCodes = serializers.SerializerMethodField()
  nonTechnicalEventNames = serializers.SerializerMethodField()
  participantNames = serializers.SerializerMethodField()
  participantFoodPreferences = serializers.SerializerMethodField()
  leadParticipantName = serializers.SerializerMethodField()
  participantEmail = serializers.SerializerMethodField()
  amountPaid = serializers.DecimalField(source="total_amount", max_digits=8, decimal_places=2)
  paymentStatus = serializers.CharField(source="payment_status")
  registrationStatus = serializers.CharField(source="registration_status")
  emailStatus = serializers.CharField(source="email_status")
  paymentReference = serializers.CharField(source="transaction_id")
  paymentProvider = serializers.CharField(source="payment_provider")
  paymentDate = serializers.DateField(source="payment_date")
  submittedAt = serializers.DateTimeField(source="created_at")
  updatedAt = serializers.DateTimeField(source="updated_at")

  def _lead_participant(self, obj):
    participants = list(obj.participants.all())
    return participants[0] if participants else None

  def get_eventName(self, obj):
    return ", ".join(event.event_name for event in selected_events_for_registration(obj))

  def get_eventCodes(self, obj):
    return [event.event_code for event in selected_events_for_registration(obj)]

  def get_eventNames(self, obj):
    return [event.event_name for event in selected_events_for_registration(obj)]

  def get_technicalEventCodes(self, obj):
    codes = getattr(obj, "technical_event_codes", None)
    if codes:
      return codes
    tech, _ = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_code for e in tech]

  def get_technicalEventNames(self, obj):
    codes = getattr(obj, "technical_event_codes", None)
    if codes:
      events_by_code = {e.event_code: e for e in selected_events_for_registration(obj)}
      return [events_by_code[c].event_name for c in codes if c in events_by_code]
    tech, _ = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_name for e in tech]

  def get_nonTechnicalEventCodes(self, obj):
    codes = getattr(obj, "non_technical_event_codes", None)
    if codes:
      return codes
    _, non_tech = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_code for e in non_tech]

  def get_nonTechnicalEventNames(self, obj):
    codes = getattr(obj, "non_technical_event_codes", None)
    if codes:
      events_by_code = {e.event_code: e for e in selected_events_for_registration(obj)}
      return [events_by_code[c].event_name for c in codes if c in events_by_code]
    _, non_tech = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_name for e in non_tech]

  def get_participantNames(self, obj):
    return [participant.full_name for participant in obj.participants.all()]

  def get_participantFoodPreferences(self, obj):
    return [participant.food_preference for participant in obj.participants.all()]

  def get_leadParticipantName(self, obj):
    lead_participant = self._lead_participant(obj)
    return lead_participant.full_name if lead_participant else ""

  def get_participantEmail(self, obj):
    lead_participant = self._lead_participant(obj)
    return lead_participant.email if lead_participant else ""

  class Meta:
    model = Registration
    fields = [
      "registrationCode",
      "eventCode",
      "eventName",
      "eventCodes",
      "eventNames",
      "technicalEventCodes",
      "technicalEventNames",
      "nonTechnicalEventCodes",
      "nonTechnicalEventNames",
      "participantNames",
      "participantFoodPreferences",
      "leadParticipantName",
      "participantEmail",
      "amountPaid",
      "paymentStatus",
      "registrationStatus",
      "emailStatus",
      "paymentReference",
      "paymentProvider",
      "paymentDate",
      "submittedAt",
      "updatedAt"
    ]


class AdminRegistrationSerializer(serializers.ModelSerializer):
  participantNames = serializers.SerializerMethodField()
  participantFoodPreferences = serializers.SerializerMethodField()
  leadParticipantName = serializers.SerializerMethodField()
  leadParticipantEmail = serializers.SerializerMethodField()
  registrationCode = serializers.CharField(source="registration_code")
  eventName = serializers.SerializerMethodField()
  eventCodes = serializers.SerializerMethodField()
  eventNames = serializers.SerializerMethodField()
  technicalEventCodes = serializers.SerializerMethodField()
  technicalEventNames = serializers.SerializerMethodField()
  nonTechnicalEventCodes = serializers.SerializerMethodField()
  nonTechnicalEventNames = serializers.SerializerMethodField()
  amountPaid = serializers.DecimalField(source="total_amount", max_digits=8, decimal_places=2)
  transactionId = serializers.CharField(source="transaction_id")
  paymentStatus = serializers.CharField(source="payment_status")
  paymentProvider = serializers.CharField(source="payment_provider")
  paymentDate = serializers.DateField(source="payment_date", format="%Y-%m-%d")
  registrationStatus = serializers.CharField(source="registration_status")
  emailStatus = serializers.CharField(source="email_status")
  adminNote = serializers.CharField(source="admin_note", allow_blank=True, allow_null=True, required=False)
  screenshotAvailable = serializers.SerializerMethodField()
  createdAt = serializers.DateTimeField(source="created_at", format="%Y-%m-%d %H:%M")

  def _lead_participant(self, obj):
    participants = list(obj.participants.all())
    return participants[0] if participants else None

  def get_participantNames(self, obj):
    return [participant.full_name for participant in obj.participants.all()]

  def get_participantFoodPreferences(self, obj):
    return [participant.food_preference for participant in obj.participants.all()]

  def get_leadParticipantName(self, obj):
    lead_participant = self._lead_participant(obj)
    return lead_participant.full_name if lead_participant else ""

  def get_leadParticipantEmail(self, obj):
    lead_participant = self._lead_participant(obj)
    return lead_participant.email if lead_participant else ""

  def get_screenshotAvailable(self, obj):
    return bool(obj.payment_screenshot_path)

  def get_eventName(self, obj):
    return ", ".join(event.event_name for event in selected_events_for_registration(obj))

  def get_eventCodes(self, obj):
    return [event.event_code for event in selected_events_for_registration(obj)]

  def get_eventNames(self, obj):
    return [event.event_name for event in selected_events_for_registration(obj)]

  def get_technicalEventCodes(self, obj):
    codes = getattr(obj, "technical_event_codes", None)
    if codes:
      return codes
    tech, _ = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_code for e in tech]

  def get_technicalEventNames(self, obj):
    codes = getattr(obj, "technical_event_codes", None)
    if codes:
      events_by_code = {e.event_code: e for e in selected_events_for_registration(obj)}
      return [events_by_code[c].event_name for c in codes if c in events_by_code]
    tech, _ = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_name for e in tech]

  def get_nonTechnicalEventCodes(self, obj):
    codes = getattr(obj, "non_technical_event_codes", None)
    if codes:
      return codes
    _, non_tech = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_code for e in non_tech]

  def get_nonTechnicalEventNames(self, obj):
    codes = getattr(obj, "non_technical_event_codes", None)
    if codes:
      events_by_code = {e.event_code: e for e in selected_events_for_registration(obj)}
      return [events_by_code[c].event_name for c in codes if c in events_by_code]
    _, non_tech = _split_events_by_track(selected_events_for_registration(obj))
    return [e.event_name for e in non_tech]

  class Meta:
    model = Registration
    fields = [
      "participantNames",
      "participantFoodPreferences",
      "leadParticipantName",
      "leadParticipantEmail",
      "registrationCode",
      "eventName",
      "eventCodes",
      "eventNames",
      "technicalEventCodes",
      "technicalEventNames",
      "nonTechnicalEventCodes",
      "nonTechnicalEventNames",
      "amountPaid",
      "transactionId",
      "paymentStatus",
      "paymentProvider",
      "paymentDate",
      "registrationStatus",
      "emailStatus",
      "adminNote",
      "screenshotAvailable",
      "createdAt"
    ]


class RegistrationActionSerializer(serializers.Serializer):
  paymentStatus = serializers.ChoiceField(choices=Registration.PAYMENT_STATUS_CHOICES, required=False)
  adminNote = serializers.CharField(required=False, allow_blank=True, max_length=1000)
