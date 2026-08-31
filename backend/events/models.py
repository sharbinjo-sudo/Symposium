from django.db import models


class Event(models.Model):
  TRACK_TECHNICAL = "Technical"
  TRACK_NON_TECHNICAL = "Non-Technical"
  TRACK_CHOICES = [
    (TRACK_TECHNICAL, "Technical"),
    (TRACK_NON_TECHNICAL, "Non-Technical"),
  ]

  event_code = models.CharField(max_length=4, unique=True)
  event_name = models.CharField(max_length=100)
  track = models.CharField(max_length=20, choices=TRACK_CHOICES, default=TRACK_TECHNICAL)
  registration_fee = models.DecimalField(max_digits=8, decimal_places=2, default=250.00)
  registration_limit = models.PositiveIntegerField(null=True, blank=True)
  is_registration_open = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["event_name"]

  def __str__(self) -> str:
    return f"{self.event_name} ({self.event_code})"

