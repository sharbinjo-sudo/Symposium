from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import serializers
import re

from events.models import Event

from .models import Participant, Registration
from .services import compute_total_amount

FULL_NAME_ERROR = "Enter a valid name without numbers, phone numbers, or email addresses."
INDIAN_MOBILE_ERROR = "Enter a valid Indian mobile number, like +91XXXXXXXXXX."


class ParticipantInputSerializer(serializers.Serializer):
  fullName = serializers.CharField(max_length=150)
  collegeName = serializers.CharField(max_length=200)
  rollNumber = serializers.CharField(max_length=50)
  mobileNumber = serializers.CharField(max_length=16)
  email = serializers.CharField(max_length=254)
  department = serializers.CharField(max_length=100)
  yearOfStudy = serializers.CharField(max_length=20)
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

  def validate_rollNumber(self, value: str) -> str:
    trimmed_value = value.strip()
    if len(trimmed_value) < 2:
      raise serializers.ValidationError("Roll number is required.")
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


class RegistrationPaymentOrderSerializer(RegistrationBaseSerializer):
  pass


class RegistrationSubmitSerializer(RegistrationBaseSerializer):
  razorpayOrderId = serializers.CharField(max_length=100)
  razorpayPaymentId = serializers.CharField(max_length=100)
  razorpaySignature = serializers.CharField(max_length=255)
  consentGiven = serializers.BooleanField()

  def validate_razorpayOrderId(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Razorpay order ID is required.")
    return trimmed_value

  def validate_razorpayPaymentId(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Razorpay payment ID is required.")
    return trimmed_value

  def validate_razorpaySignature(self, value: str) -> str:
    trimmed_value = value.strip()
    if not trimmed_value:
      raise serializers.ValidationError("Razorpay signature is required.")
    return trimmed_value

  def validate(self, attrs):
    attrs = super().validate(attrs)

    if not attrs["consentGiven"]:
      raise serializers.ValidationError({"consentGiven": "Consent is required."})

    return attrs


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


class AdminRegistrationSerializer(serializers.ModelSerializer):
  registrationCode = serializers.CharField(source="registration_code")
  eventName = serializers.CharField(source="event.event_name")
  teamName = serializers.CharField(source="team_name", allow_null=True, required=False)
  paymentStatus = serializers.CharField(source="payment_status")
  registrationStatus = serializers.CharField(source="registration_status")
  emailStatus = serializers.CharField(source="email_status")
  createdAt = serializers.DateTimeField(source="created_at", format="%Y-%m-%d %H:%M")

  class Meta:
    model = Registration
    fields = [
      "registrationCode",
      "eventName",
      "teamName",
      "paymentStatus",
      "registrationStatus",
      "emailStatus",
      "createdAt"
    ]


class RegistrationActionSerializer(serializers.Serializer):
  paymentStatus = serializers.ChoiceField(choices=Registration.PAYMENT_STATUS_CHOICES, required=False)
  adminNote = serializers.CharField(required=False, allow_blank=True)
  attendanceMarked = serializers.BooleanField(required=False)
