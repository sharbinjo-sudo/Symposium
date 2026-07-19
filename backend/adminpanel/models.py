from django.contrib.auth.hashers import check_password
from django.db import models


class AdminUser(models.Model):
  ROLE_SUPERADMIN = "superadmin"
  ROLE_VERIFIER = "verifier"
  ROLE_CHOICES = [
    (ROLE_SUPERADMIN, "Superadmin"),
    (ROLE_VERIFIER, "Verifier")
  ]

  name = models.CharField(max_length=100)
  email = models.EmailField(unique=True)
  password_hash = models.CharField(max_length=255)
  role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_VERIFIER)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)

  def verify_password(self, raw_password: str) -> bool:
    return check_password(raw_password, self.password_hash)

  def __str__(self) -> str:
    return self.email


class AuditLog(models.Model):
  admin = models.ForeignKey(AdminUser, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs")
  action = models.CharField(max_length=100)
  entity_type = models.CharField(max_length=50)
  entity_id = models.CharField(max_length=50)
  metadata = models.JSONField(default=dict)
  timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

  class Meta:
    ordering = ["-timestamp"]

