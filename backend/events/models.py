from django.db import models


class Event(models.Model):
  FEE_TYPE_PER_PARTICIPANT = "per_participant"
  FEE_TYPE_PER_TEAM = "per_team"
  FEE_TYPE_CHOICES = [
    (FEE_TYPE_PER_PARTICIPANT, "Per participant"),
    (FEE_TYPE_PER_TEAM, "Per team")
  ]

  event_code = models.CharField(max_length=4, unique=True)
  event_name = models.CharField(max_length=100)
  minimum_team_size = models.PositiveSmallIntegerField(default=1)
  maximum_team_size = models.PositiveSmallIntegerField(default=1)
  registration_fee_type = models.CharField(max_length=24, choices=FEE_TYPE_CHOICES, default=FEE_TYPE_PER_PARTICIPANT)
  registration_fee = models.DecimalField(max_digits=8, decimal_places=2, default=250.00)
  registration_limit = models.PositiveIntegerField(null=True, blank=True)
  is_registration_open = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["event_name"]

  def __str__(self) -> str:
    return f"{self.event_name} ({self.event_code})"

