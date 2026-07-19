from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from adminpanel.models import AdminUser


class Command(BaseCommand):
  help = "Create or update a custom adminpanel user."

  def add_arguments(self, parser):
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="CYBERPUNK Admin")
    parser.add_argument("--role", choices=[AdminUser.ROLE_SUPERADMIN, AdminUser.ROLE_VERIFIER], default=AdminUser.ROLE_SUPERADMIN)

  def handle(self, *args, **options):
    email = options["email"].strip().lower()
    password = options["password"]

    if len(password) < 8:
      raise CommandError("Password must be at least 8 characters.")

    admin, created = AdminUser.objects.update_or_create(
      email=email,
      defaults={
        "name": options["name"],
        "password_hash": make_password(password),
        "role": options["role"],
        "is_active": True
      }
    )

    action = "created" if created else "updated"
    self.stdout.write(self.style.SUCCESS(f"Admin user {action}: {admin.email}"))
