import json
import logging
from urllib import request
from urllib.error import HTTPError, URLError

from django.conf import settings
from django.utils import timezone

from registrations.models import Registration

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
  payload = json.dumps({
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
  }).encode("utf-8")

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
      body = response.read().decode("utf-8", errors="replace")
      logger.info("EmailJS OK for %s: %s", recipient_email, body)
      return 200 <= response.status < 300
  except HTTPError as exc:
    try:
      error_body = exc.read().decode("utf-8", errors="replace")
    except Exception:
      error_body = "<unavailable>"
    logger.warning("EmailJS FAILED for %s: %s %s", recipient_email, exc.code, error_body)
    return False
  except URLError as exc:
    logger.warning("EmailJS NETWORK ERROR for %s: %s", recipient_email, exc.reason)
    return False
  except Exception as exc:
    logger.exception("EmailJS UNKNOWN ERROR for %s: %s", recipient_email, exc)
    return False

def _get_admin_template_id() -> str:
  return getattr(settings, "EMAILJS_ADMIN_TEMPLATE_ID", "").strip() or settings.EMAILJS_TEMPLATE_ID

def _event_date_label() -> str:
  event_date = getattr(settings, "EVENT_DATE", "")
  if event_date:
    return str(event_date)
  return "11 September 2026"

def _build_participant_2_block(participants: list) -> str:
  participant_2 = None
  for p in participants:
    if p.participant_number == 2:
      participant_2 = p
      break
  if participant_2 is None:
    return ""
  return f"""<div style="background:#f8f9fa; border-left:4px solid #b3344a; padding:16px; margin:20px 0;">
<h3 style="margin:0 0 12px;">Participant 2 Details</h3>
<p><strong>Name:</strong> {participant_2.full_name}</p>
<p><strong>Email:</strong> {participant_2.email.strip().lower()}</p>
<p><strong>Phone:</strong> {participant_2.mobile_number}</p>
<p><strong>College:</strong> {participant_2.college_name}</p>
<p><strong>Department:</strong> {participant_2.department}</p>
<p><strong>Year:</strong> {participant_2.year_of_study}</p>
<p><strong>Food Preference:</strong> {participant_2.get_food_preference_display()}</p>
</div>"""

def _build_participant_1_params(participants: list) -> dict[str, str]:
  participant_1 = None
  for p in participants:
    if p.participant_number == 1:
      participant_1 = p
      break
  if participant_1 is None:
    return {
      "participant_1_name": "",
      "participant_1_email": "",
      "participant_1_phone": "",
      "participant_1_college": "",
      "participant_1_department": "",
      "participant_1_year": "",
      "participant_1_food_preference": ""
    }
  return {
    "participant_1_name": participant_1.full_name,
    "participant_1_email": participant_1.email.strip().lower(),
    "participant_1_phone": participant_1.mobile_number,
    "participant_1_college": participant_1.college_name,
    "participant_1_department": participant_1.department,
    "participant_1_year": participant_1.year_of_study,
    "participant_1_food_preference": participant_1.get_food_preference_display()
  }

def _build_registration_template_params(registration, participant, recipient_email: str, audience: str) -> dict[str, str]:
  participant_email = participant.email.strip().lower()
  all_participants = list(registration.participants.all())
  participant_food_preference = participant.get_food_preference_display()
  food_preferences = ", ".join(
    f"{p.full_name}: {p.get_food_preference_display()}" for p in all_participants
  )
  team_members = ", ".join(p.full_name for p in all_participants)
  team_name = registration.team_name or (
    "Solo entry" if registration.team_size == 1 else f"Team of {registration.team_size}"
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
  template_params.update(_build_participant_1_params(all_participants))
  template_params["participant_2_block"] = _build_participant_2_block(all_participants)
  return template_params

def send_registration_notifications(registration) -> bool:
  # Atomic idempotency: claim the lock before doing any sending work.
  # select_for_update() blocks concurrent callers until the first one commits.
  from django.db import transaction
  with transaction.atomic():
    locked = Registration.objects.select_for_update().get(pk=registration.pk)
    if locked.email_status in (Registration.EMAIL_SENT, Registration.EMAIL_SENDING):
      logger.info("Email already sent/sending for %s, skipping.", locked.registration_code)
      return True
    locked.email_status = Registration.EMAIL_SENDING
    locked.save(update_fields=["email_status", "updated_at"])

  registration.refresh_from_db()
  result = False
  try:
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

    admin_email = settings.ADMIN_NOTIFICATION_EMAIL.strip().lower()
    participant_results: list[bool] = []
    participant_recipient_emails: set[str] = set()

    # Step 1: Send participant confirmation to EACH participant (only their own email)
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
        registration, participant, participant_email, "participant"
      )
      sent = _send_emailjs_message(participant_email, settings.EMAILJS_TEMPLATE_ID, participant_template_params)
      participant_results.append(sent)
      logger.info(
        "Participant email %s to %s: %s",
        registration.registration_code,
        participant_email,
        "sent" if sent else "FAILED"
      )

    participant_sent = bool(participant_results) and all(participant_results)

    # Step 2: Send admin notification ONLY to admin email (never to participants)
    lead_participant = participants[0]
    admin_sent = True
    if not admin_email:
      logger.warning("Admin notification skipped for %s because ADMIN_NOTIFICATION_EMAIL is missing.", registration.registration_code)
    elif admin_email in participant_recipient_emails:
      logger.info(
        "Admin notification skipped for %s because admin email %s is also a participant.",
        registration.registration_code,
        admin_email
      )
    else:
      admin_template_params = _build_registration_template_params(registration, lead_participant, admin_email, "admin")
      admin_sent = _send_emailjs_message(admin_email, _get_admin_template_id(), admin_template_params)
      logger.info(
        "Admin email %s to %s: %s",
        registration.registration_code,
        admin_email,
        "sent" if admin_sent else "FAILED"
      )

    result = participant_sent and admin_sent
    return result
  finally:
    registration.refresh_from_db()
    registration.email_status = Registration.EMAIL_SENT if result else Registration.EMAIL_FAILED
    registration.save(update_fields=["email_status", "updated_at"])
    logger.info(
      "Email summary for %s: result=%s",
      registration.registration_code, result
    )
