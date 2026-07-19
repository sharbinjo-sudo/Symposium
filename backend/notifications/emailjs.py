import json
import logging
from urllib import request
from urllib.error import HTTPError, URLError

from django.conf import settings

logger = logging.getLogger(__name__)


def _missing_emailjs_settings() -> list[str]:
  missing: list[str] = []

  if not settings.EMAILJS_SERVICE_ID:
    missing.append("EMAILJS_SERVICE_ID")
  if not settings.EMAILJS_TEMPLATE_ID:
    missing.append("EMAILJS_TEMPLATE_ID")
  if not settings.EMAILJS_PUBLIC_KEY:
    missing.append("EMAILJS_PUBLIC_KEY")
  if not settings.EMAILJS_PRIVATE_KEY:
    missing.append("EMAILJS_PRIVATE_KEY")

  return missing


def _send_emailjs_message(recipient_email: str, template_id: str, template_params: dict[str, str]) -> bool:
  payload = json.dumps(
    {
      "service_id": settings.EMAILJS_SERVICE_ID,
      "template_id": template_id,
      "user_id": settings.EMAILJS_PUBLIC_KEY,
      "accessToken": settings.EMAILJS_PRIVATE_KEY,
      "template_params": {
        **template_params,
        "to_email": recipient_email,
        "receiver_email": recipient_email
      }
    }
  ).encode("utf-8")

  req = request.Request(
    url="https://api.emailjs.com/api/v1.0/email/send",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
  )

  try:
    with request.urlopen(req, timeout=8) as response:
      return 200 <= response.status < 300
  except HTTPError as exc:
    try:
      error_body = exc.read().decode("utf-8", errors="replace")
    except Exception:
      error_body = "<unavailable>"
    logger.warning("EmailJS send failed for %s: %s %s", recipient_email, exc.code, error_body)
    return False
  except URLError as exc:
    logger.warning("EmailJS network error for %s: %s", recipient_email, exc.reason)
    return False
  except Exception as exc:
    logger.exception("Unexpected EmailJS error for %s: %s", recipient_email, exc)
    return False


def send_registration_notifications(registration) -> bool:
  missing_settings = _missing_emailjs_settings()
  if missing_settings:
    logger.warning(
      "Registration email skipped for %s. Missing EmailJS settings: %s",
      registration.registration_code,
      ", ".join(missing_settings)
    )
    return False

  lead_participant = registration.participants.order_by("participant_number").first()
  if lead_participant is None or not lead_participant.email:
    logger.warning("Registration email skipped for %s. Lead participant email is missing.", registration.registration_code)
    return False

  admin_email = settings.ADMIN_NOTIFICATION_EMAIL.strip()
  participant_email = lead_participant.email.strip().lower()
  participant_template_params = {
    "registration_code": registration.registration_code,
    "event_name": registration.event.event_name,
    "team_name": registration.team_name or "Solo entry",
    "payment_status": registration.payment_status,
    "admin_email": admin_email,
    "participant_name": lead_participant.full_name,
    "participant_email": participant_email
  }

  participant_sent = _send_emailjs_message(
    participant_email,
    settings.EMAILJS_TEMPLATE_ID,
    participant_template_params
  )

  admin_template_id = getattr(settings, "EMAILJS_ADMIN_TEMPLATE_ID", "").strip()
  if admin_template_id and admin_email and admin_email.lower() != participant_email:
    admin_template_params = {
      "registration_code": registration.registration_code,
      "event_name": registration.event.event_name,
      "team_name": registration.team_name or "Solo entry",
      "payment_status": registration.payment_status,
      "participant_name": lead_participant.full_name,
      "participant_email": participant_email
    }
    _send_emailjs_message(admin_email, admin_template_id, admin_template_params)

  return participant_sent
