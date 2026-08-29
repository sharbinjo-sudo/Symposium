from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.utils import timezone
from rest_framework import serializers
import re

from events.models import Event

from .models import Participant, Registration
from .services import compute_total_amount, normalize_transaction_id, resolve_upload_token

FULL_NAME_ERROR = "Enter a valid name without numbers, phone numbers, or email addresses."
INDIAN_MOBILE_ERROR = "Enter a valid Indian mobile number, like +91XXXXXXXXXX."


class ParticipantInputSerializer(serializers.Serializer):
  fullName = serializers.CharField(max_length=150)
  collegeName = serializers.CharField(max_length=200)
  rollNumber = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
  mobileNumber = serializers.CharField(max_length=16)
  email = serializers.CharField(max_length=254)
  department = serializers.CharField(max_length=100)
  yearOfStudy = serializers.CharField(max_length=20)
  foodPreference = serializers.ChoiceField(choices=Participant.FOOD_PREFERENCE_CHOICES)
  isTeamLeader = serializers.BooleanField()

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
  eventCode = serializers.CharField(max_length=4)
  teamName = serializers.CharField(max_length=100, allow_blank=True, required=False)
  teamSize = serializers.IntegerField(min_value=1, max_value=4)
  participants = ParticipantInputSerializer(many=True)
  idempotencyKey = serializers.CharField(max_length=64)

  def validate_teamName(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      return ""
    if len(trimmed_value) < 2:
      raise serializers.ValidationError("Team name is required.")
    return trimmed_value

  def validate_idempotencyKey(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Request key is required.")
    return trimmed_value

  def validate(self, attrs):
    try:
      event = Event.objects.get(event_code=attrs["eventCode"])
    except Event.DoesNotExist as exc:
      raise serializers.ValidationError({"eventCode": "Selected event does not exist."}) from exc

    if not event.is_registration_open:
      raise serializers.ValidationError({"eventCode": "Registration is closed for this event."})

    team_size = attrs["teamSize"]
    participants = attrs["participants"]

    if team_size < event.minimum_team_size or team_size > event.maximum_team_size:
      raise serializers.ValidationError({"teamSize": "Team size is outside the allowed range for this event."})

    if len(participants) != team_size:
      raise serializers.ValidationError({"participants": "Participant count must match team size."})

    attrs["teamName"] = attrs.get("teamName", "").strip()

    if event.maximum_team_size > 1 and not attrs["teamName"]:
      raise serializers.ValidationError({"teamName": "Team name is required."})

    attrs["event"] = event
    attrs["total_amount"] = compute_total_amount(event, team_size)
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
  teamName = serializers.CharField(max_length=100, required=False, allow_blank=True)
  transactionId = serializers.CharField(max_length=100, required=False, allow_blank=True)
  participants = PrecheckParticipantSerializer(many=True, required=False)

  def validate_eventCode(self, value: str) -> str:
    return value.strip().upper()

  def validate_teamName(self, value: str) -> str:
    return value.strip()

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
  paymentStatus = serializers.CharField(source="payment_status")
  emailStatus = serializers.CharField(source="email_status")
  paymentReference = serializers.CharField(source="transaction_id")
  paymentDate = serializers.DateField(source="payment_date")
  paymentProvider = serializers.CharField(source="payment_provider")

  class Meta:
    model = Registration
    fields = [
      "registrationCode",
      "paymentStatus",
      "emailStatus",
      "paymentReference",
      "paymentDate",
      "paymentProvider"
    ]


class RegistrationStatusResponseSerializer(serializers.ModelSerializer):
  registrationCode = serializers.CharField(source="registration_code")
  eventCode = serializers.CharField(source="event.event_code")
  eventName = serializers.CharField(source="event.event_name")
  teamName = serializers.SerializerMethodField()
  teamSize = serializers.IntegerField(source="team_size")
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

  def get_teamName(self, obj):
    return obj.team_name or "Solo entry"

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
      "teamName",
      "teamSize",
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
  eventName = serializers.CharField(source="event.event_name")
  teamName = serializers.CharField(source="team_name", allow_null=True, required=False)
  teamSize = serializers.IntegerField(source="team_size")
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

  class Meta:
    model = Registration
    fields = [
      "participantNames",
      "participantFoodPreferences",
      "leadParticipantName",
      "leadParticipantEmail",
      "registrationCode",
      "eventName",
      "teamName",
      "teamSize",
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
