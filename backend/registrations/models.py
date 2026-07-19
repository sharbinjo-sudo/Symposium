from django.db import models

from events.models import Event


class Registration(models.Model):
  PAYMENT_PROVIDER_MANUAL = "manual"
  PAYMENT_PROVIDER_RAZORPAY = "razorpay"
  PAYMENT_PROVIDER_CHOICES = [
    (PAYMENT_PROVIDER_MANUAL, "Manual"),
    (PAYMENT_PROVIDER_RAZORPAY, "Razorpay")
  ]

  PAYMENT_PENDING = "pending_verification"
  PAYMENT_VERIFIED = "verified"
  PAYMENT_REJECTED = "rejected"
  PAYMENT_NEEDS_CLARIFICATION = "needs_clarification"
  PAYMENT_STATUS_CHOICES = [
    (PAYMENT_PENDING, "Pending verification"),
    (PAYMENT_VERIFIED, "Verified"),
    (PAYMENT_REJECTED, "Rejected"),
    (PAYMENT_NEEDS_CLARIFICATION, "Needs clarification")
  ]

  STATUS_SUBMITTED = "submitted"
  STATUS_CANCELLED = "cancelled"
  REGISTRATION_STATUS_CHOICES = [
    (STATUS_SUBMITTED, "Submitted"),
    (STATUS_CANCELLED, "Cancelled")
  ]

  EMAIL_PENDING = "pending"
  EMAIL_SENT = "sent"
  EMAIL_FAILED = "failed"
  EMAIL_STATUS_CHOICES = [
    (EMAIL_PENDING, "Pending"),
    (EMAIL_SENT, "Sent"),
    (EMAIL_FAILED, "Failed")
  ]

  registration_code = models.CharField(max_length=20, unique=True, db_index=True)
  event = models.ForeignKey(Event, on_delete=models.PROTECT, related_name="registrations")
  team_name = models.CharField(max_length=100, null=True, blank=True)
  team_size = models.PositiveSmallIntegerField()
  total_amount = models.DecimalField(max_digits=8, decimal_places=2)
  transaction_id = models.CharField(max_length=100, unique=True, db_index=True)
  payment_provider = models.CharField(
    max_length=24,
    choices=PAYMENT_PROVIDER_CHOICES,
    default=PAYMENT_PROVIDER_MANUAL,
    db_index=True
  )
  payment_order_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
  payment_signature = models.CharField(max_length=255, blank=True, default="")
  payment_date = models.DateField()
  payment_screenshot_path = models.CharField(max_length=500, blank=True, default="")
  payment_status = models.CharField(max_length=32, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_PENDING, db_index=True)
  admin_note = models.TextField(null=True, blank=True)
  registration_status = models.CharField(max_length=24, choices=REGISTRATION_STATUS_CHOICES, default=STATUS_SUBMITTED)
  email_status = models.CharField(max_length=16, choices=EMAIL_STATUS_CHOICES, default=EMAIL_PENDING)
  idempotency_key = models.CharField(max_length=64, unique=True)
  consent_given = models.BooleanField(default=False)
  attendance_marked = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True, db_index=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["-created_at"]

  def __str__(self) -> str:
    return self.registration_code


class Participant(models.Model):
  registration = models.ForeignKey(Registration, on_delete=models.CASCADE, related_name="participants")
  participant_number = models.PositiveSmallIntegerField()
  full_name = models.CharField(max_length=150)
  college_name = models.CharField(max_length=200)
  roll_number = models.CharField(max_length=50, db_index=True)
  mobile_number = models.CharField(max_length=15, db_index=True)
  email = models.EmailField(db_index=True)
  department = models.CharField(max_length=100)
  year_of_study = models.CharField(max_length=20)
  is_team_leader = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ["participant_number"]

  def __str__(self) -> str:
    return self.full_name
