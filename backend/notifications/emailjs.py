import json
import logging
from urllib import request
from urllib.error import HTTPError, URLError

from django.conf import settings
from django.utils import timezone

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
        "to": recipient_email,
        "to_email": recipient_email,
        "email": recipient_email,
        "user_email": recipient_email,
        "recipient_email": recipient_email,
        "receiver_email": recipient_email,
        "reply_to": recipient_email
      }
    }
  ).encode("utf-8")

  req = request.Request(
    url="https://api.emailjs.com/api/v1.0/email/send",
    data=payload,
    headers={
      "Content-Type": "application/json",
      "User-Agent": "CYBERPUNK26-Backend/1.0"
    },
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


def _get_admin_template_id() -> str:
  return getattr(settings, "EMAILJS_ADMIN_TEMPLATE_ID", "").strip() or settings.EMAILJS_TEMPLATE_ID


def _event_date_label() -> str:
  event_date = getattr(settings, "EVENT_DATE", "")
  if event_date:
    return str(event_date)
  return "11 September 2026"


def _build_admin_participant_params(participants) -> dict[str, str]:
  params: dict[str, str] = {}
  max_slots = max(2, len(participants))

  for slot_number in range(1, max_slots + 1):
    params.update(
      {
        f"participant_{slot_number}_name": "",
        f"participant_{slot_number}_email": "",
        f"participant_{slot_number}_phone": "",
        f"participant_{slot_number}_college": "",
        f"participant_{slot_number}_roll_number": "",
        f"participant_{slot_number}_department": "",
        f"participant_{slot_number}_year": "",
        f"participant_{slot_number}_food_preference": ""
      }
    )

  for participant in participants:
    slot_number = participant.participant_number
    params.update(
      {
        f"participant_{slot_number}_name": participant.full_name,
        f"participant_{slot_number}_email": participant.email.strip().lower(),
        f"participant_{slot_number}_phone": participant.mobile_number,
        f"participant_{slot_number}_college": participant.college_name,
        f"participant_{slot_number}_roll_number": participant.roll_number,
        f"participant_{slot_number}_department": participant.department,
        f"participant_{slot_number}_year": participant.year_of_study,
        f"participant_{slot_number}_food_preference": participant.get_food_preference_display()
      }
    )

  return params


def _build_registration_template_params(registration, participant, recipient_email: str, audience: str) -> dict[str, str]:
  participant_email = participant.email.strip().lower()
  all_participants = list(registration.participants.all())
  participant_food_preference = participant.get_food_preference_display()
  food_preferences = ", ".join(
    f"{team_participant.full_name}: {team_participant.get_food_preference_display()}"
    for team_participant in all_participants
  )
  team_members = ", ".join(team_participant.full_name for team_participant in all_participants)
  team_name = registration.team_name or (
    "Solo entry" if registration.team_size == 1 else f"Team of {registration.team_size}"
  )
  participants_summary = " | ".join(
    (
      f"{team_participant.participant_number}. {team_participant.full_name} - "
      f"{team_participant.email.strip().lower()} - {team_participant.mobile_number} - "
      f"{team_participant.college_name} - {team_participant.roll_number} - "
      f"{team_participant.department} - {team_participant.year_of_study} - "
      f"{team_participant.get_food_preference_display()}"
    )
    for team_participant in all_participants
  )
  submitted_at = timezone.localtime(registration.created_at).strftime("%d %B %Y, %I:%M %p")

  template_params = {
    "email_audience": audience,
    "registration_code": registration.registration_code,
    "event": registration.event.event_name,
    "event_name": registration.event.event_name,
    "selected_event": registration.event.event_name,
    "team_name": team_name,
    "team_members": team_members,
    "participant_count": str(registration.team_size),
    "participants_summary": participants_summary if audience == "admin" else "",
    "payment_status": registration.payment_status,
    "admin_email": settings.ADMIN_NOTIFICATION_EMAIL.strip(),
    "name": participant.full_name,
    "full_name": participant.full_name,
    "participant_name": participant.full_name,
    "participant_email": participant_email,
    "phone": participant.mobile_number,
    "mobile": participant.mobile_number,
    "mobile_number": participant.mobile_number,
    "college": participant.college_name,
    "college_name": participant.college_name,
    "department": participant.department,
    "year": participant.year_of_study,
    "year_of_study": participant.year_of_study,
    "food": participant_food_preference,
    "food_preference": participant_food_preference,
    "participant_food_preferences": food_preferences,
    "date": _event_date_label(),
    "event_date": _event_date_label(),
    "submitted_at": submitted_at,
    "venue": "V V College of Engineering, Tisaiyanvillai",
    "recipient_email": recipient_email
  }

  if audience == "admin":
    template_params.update(_build_admin_participant_params(all_participants))

  return template_params


def send_registration_notifications(registration) -> bool:
  missing_settings = _missing_emailjs_settings()
  if missing_settings:
    logger.warning(
      "Registration email skipped for %s. Missing EmailJS settings: %s",
      registration.registration_code,
      ", ".join(missing_settings)
    )
    return False

  participants = list(registration.participants.order_by("participant_number"))
  if not participants:
    logger.warning("Registration email skipped for %s. Participant list is empty.", registration.registration_code)
    return False

  admin_email = settings.ADMIN_NOTIFICATION_EMAIL.strip()
  participant_results: list[bool] = []
  participant_recipient_emails: set[str] = set()

  for participant in participants:
    participant_email = participant.email.strip().lower()
    if not participant_email:
      logger.warning(
        "Participant email skipped for %s participant %s because the email is missing.",
        registration.registration_code,
        participant.participant_number
      )
      participant_results.append(False)
      continue

    if participant_email in participant_recipient_emails:
      logger.info(
        "Duplicate participant email skipped for %s: %s",
        registration.registration_code,
        participant_email
      )
      continue

    participant_recipient_emails.add(participant_email)
    participant_template_params = _build_registration_template_params(
      registration,
      participant,
      participant_email,
      "participant"
    )

    participant_results.append(
      _send_emailjs_message(
        participant_email,
        settings.EMAILJS_TEMPLATE_ID,
        participant_template_params
      )
    )

  participant_sent = bool(participant_results) and all(participant_results)
  lead_participant = participants[0]
  admin_sent = True
  if admin_email and admin_email.lower() not in participant_recipient_emails:
    admin_template_params = _build_registration_template_params(registration, lead_participant, admin_email, "admin")
    admin_sent = _send_emailjs_message(admin_email, _get_admin_template_id(), admin_template_params)
  elif admin_email:
    logger.info("Admin notification skipped for %s because admin and participant emails match.", registration.registration_code)
  else:
    logger.warning("Admin notification skipped for %s because ADMIN_NOTIFICATION_EMAIL is missing.", registration.registration_code)

  return participant_sent and admin_sent
