import json
import logging
from urllib import request
from urllib.error import HTTPError, URLError

from django.conf import settings
from django.utils import timezone

from registrations.models import Registration
from registrations.services import selected_events_for_registration

logger = logging.getLogger(__name__)

def _provider_missing_fields(provider: dict[str, str]) -> list[str]:
  missing: list[str] = []
  for field in ("service_id", "template_id", "public_key"):
    if not provider.get(field):
      missing.append(field)
  return missing

def _build_emailjs_providers(
  primary_template_id: str,
  fallback_template_id: str,
  primary_service_id: str = "",
  primary_public_key: str = "",
  primary_private_key: str = "",
  fallback_service_id: str = "",
  fallback_public_key: str = "",
  fallback_private_key: str = ""
) -> list[dict[str, str]]:
  providers = [
    {
      "label": "primary",
      "service_id": primary_service_id.strip() or settings.EMAILJS_SERVICE_ID.strip(),
      "template_id": primary_template_id.strip(),
      "public_key": primary_public_key.strip() or settings.EMAILJS_PUBLIC_KEY.strip(),
      "private_key": primary_private_key.strip() or settings.EMAILJS_PRIVATE_KEY.strip()
    }
  ]

  fallback_provider = {
    "label": "fallback",
    "service_id": fallback_service_id.strip() or getattr(settings, "EMAILJS_FALLBACK_SERVICE_ID", "").strip(),
    "template_id": fallback_template_id.strip(),
    "public_key": (
      fallback_public_key.strip()
      or getattr(settings, "EMAILJS_FALLBACK_PUBLIC_KEY", "").strip()
      or settings.EMAILJS_PUBLIC_KEY.strip()
    ),
    "private_key": (
      fallback_private_key.strip()
      or getattr(settings, "EMAILJS_FALLBACK_PRIVATE_KEY", "").strip()
      or settings.EMAILJS_PRIVATE_KEY.strip()
    )
  }
  if fallback_template_id.strip() or fallback_service_id.strip() or fallback_public_key.strip() or fallback_private_key.strip():
    providers.append(fallback_provider)

  ready_providers: list[dict[str, str]] = []
  for provider in providers:
    missing = _provider_missing_fields(provider)
    if missing:
      logger.warning(
        "EMAILJS provider skipped [%s]: missing %s",
        provider["label"],
        ", ".join(missing)
      )
      continue
    ready_providers.append(provider)

  return ready_providers

def _send_emailjs_message(
  recipient_email: str,
  provider: dict[str, str],
  template_params: dict[str, str],
  purpose: str = "",
) -> bool:
  """Send one email via EmailJS. Logs template_id and recipient for diagnostics."""
  payload = json.dumps({
    "service_id": provider["service_id"],
    "template_id": provider["template_id"],
    "user_id": provider["public_key"],
    "accessToken": provider["private_key"],
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

  logger.info(
    "EMAILJS SEND [%s/%s]: service=%s template=%s recipient=%s",
    purpose or "unknown",
    provider["label"],
    provider["service_id"],
    provider["template_id"],
    recipient_email,
  )

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
    with request.urlopen(req, timeout=15) as response:
      body = response.read().decode("utf-8", errors="replace")
      logger.info(
        "EMAILJS OK [%s/%s]: service=%s template=%s recipient=%s response=%s",
        purpose,
        provider["label"],
        provider["service_id"],
        provider["template_id"],
        recipient_email,
        body
      )
      return 200 <= response.status < 300
  except HTTPError as exc:
    try:
      error_body = exc.read().decode("utf-8", errors="replace")
    except Exception:
      error_body = "<unavailable>"
    logger.warning(
      "EMAILJS FAILED [%s/%s]: service=%s template=%s recipient=%s status=%s body=%s",
      purpose,
      provider["label"],
      provider["service_id"],
      provider["template_id"],
      recipient_email,
      exc.code,
      error_body
    )
    return False
  except URLError as exc:
    logger.warning(
      "EMAILJS NETWORK ERROR [%s/%s]: service=%s template=%s recipient=%s error=%s",
      purpose,
      provider["label"],
      provider["service_id"],
      provider["template_id"],
      recipient_email,
      exc.reason
    )
    return False
  except Exception as exc:
    logger.exception(
      "EMAILJS UNKNOWN ERROR [%s/%s]: service=%s template=%s recipient=%s error=%s",
      purpose,
      provider["label"],
      provider["service_id"],
      provider["template_id"],
      recipient_email,
      exc
    )
    return False

def _send_emailjs_message_with_fallback(
  recipient_email: str,
  primary_template_id: str,
  fallback_template_id: str,
  template_params: dict[str, str],
  purpose: str = "",
  primary_service_id: str = "",
  primary_public_key: str = "",
  primary_private_key: str = "",
  fallback_service_id: str = "",
  fallback_public_key: str = "",
  fallback_private_key: str = ""
) -> bool:
  providers = _build_emailjs_providers(
    primary_template_id,
    fallback_template_id,
    primary_service_id=primary_service_id,
    primary_public_key=primary_public_key,
    primary_private_key=primary_private_key,
    fallback_service_id=fallback_service_id,
    fallback_public_key=fallback_public_key,
    fallback_private_key=fallback_private_key
  )
  if not providers:
    logger.warning("EMAILJS skipped [%s]: no complete primary or fallback provider is configured.", purpose)
    return False

  for index, provider in enumerate(providers):
    if index > 0:
      logger.info(
        "EMAILJS FALLBACK ATTEMPT [%s]: service=%s template=%s recipient=%s",
        purpose,
        provider["service_id"],
        provider["template_id"],
        recipient_email
      )

    if _send_emailjs_message(recipient_email, provider, template_params, purpose=purpose):
      return True

  logger.warning("EMAILJS exhausted providers [%s]: recipient=%s", purpose, recipient_email)
  return False

def _get_admin_template_id() -> str:
  """Return the admin template ID. No fallback to participant template."""
  admin_id = getattr(settings, "EMAILJS_ADMIN_TEMPLATE_ID", "").strip()
  if not admin_id:
    logger.error(
      "EMAILJS_ADMIN_TEMPLATE_ID is empty! Admin emails will be skipped. "
      "Set this in your environment variables."
    )
  return admin_id

def _event_date_label() -> str:
  event_date = getattr(settings, "EVENT_DATE", "")
  if event_date:
    return str(event_date)
  return "11 September 2026"

def _build_participant_1_params(participant) -> dict[str, str]:
  return {
    "participant_1_name": participant.full_name,
    "participant_1_email": participant.email.strip().lower(),
    "participant_1_phone": participant.mobile_number,
    "participant_1_college": participant.college_name,
    "participant_1_department": participant.department,
    "participant_1_year": participant.year_of_study,
    "participant_1_food_preference": participant.get_food_preference_display()
  }

def _build_registration_template_params(registration, participant, recipient_email: str, audience: str) -> dict[str, str]:
  participant_email = participant.email.strip().lower()
  selected_event_names = ", ".join(event.event_name for event in selected_events_for_registration(registration))
  participant_food_preference = participant.get_food_preference_display()
  submitted_at = timezone.localtime(registration.created_at).strftime("%d %B %Y, %I:%M %p")

  template_params = {
    "email_audience": audience,
    "registration_code": registration.registration_code,
    "event": selected_event_names,
    "event_name": selected_event_names,
    "selected_event": selected_event_names,
    "payment_status": registration.get_payment_status_display(),
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
    "date": _event_date_label(),
    "event_date": _event_date_label(),
    "submitted_at": submitted_at,
    "venue": "V V College of Engineering, V V Nagar, Arasoor, Tisaiyanvilai (Via), Sathankulam Taluk, Tirunelveli District, Tamil Nadu - 627657",
    "recipient_email": recipient_email
  }
  template_params.update(_build_participant_1_params(participant))
  return template_params

def send_admin_registration_notification(registration) -> bool:
  admin_template_id = _get_admin_template_id()
  fallback_admin_template_id = getattr(settings, "EMAILJS_FALLBACK_ADMIN_TEMPLATE_ID", "").strip()

  logger.info(
    "ADMIN EMAIL DISPATCH START for %s: admin_template=%s fallback_template=%s",
    registration.registration_code,
    admin_template_id or "(not configured)",
    fallback_admin_template_id or "(not configured)"
  )

  if not settings.ADMIN_NOTIFICATION_EMAIL:
    logger.warning(
      "Admin registration email skipped for %s. Missing ADMIN_NOTIFICATION_EMAIL.",
      registration.registration_code
    )
    return False

  participants = list(registration.participants.order_by("participant_number"))
  if not participants:
    logger.warning("Admin registration email skipped for %s. Participant list is empty.", registration.registration_code)
    return False

  admin_email = settings.ADMIN_NOTIFICATION_EMAIL.strip().lower()
  template_params = _build_registration_template_params(registration, participants[0], admin_email, "admin")
  sent = _send_emailjs_message_with_fallback(
    admin_email,
    admin_template_id,
    fallback_admin_template_id,
    template_params,
    purpose="ADMIN_NEW_REGISTRATION",
  )

  logger.info(
    "ADMIN EMAIL DISPATCH RESULT for %s: sent=%s",
    registration.registration_code,
    sent
  )
  return sent

def send_participant_registration_confirmation(registration) -> bool:
  participant_template_id = settings.EMAILJS_TEMPLATE_ID.strip()
  fallback_participant_template_id = getattr(settings, "EMAILJS_FALLBACK_TEMPLATE_ID", "").strip()

  logger.info(
    "PARTICIPANT EMAIL DISPATCH START for %s: participant_template=%s fallback_template=%s",
    registration.registration_code,
    participant_template_id,
    fallback_participant_template_id or "(not configured)"
  )

  # Atomic idempotency: claim the lock before doing any sending work.
  from django.db import transaction
  with transaction.atomic():
    locked = Registration.objects.select_for_update().get(pk=registration.pk)
    if locked.email_status == Registration.EMAIL_SENDING:
      logger.info("Email already sent/sending for %s, skipping.", locked.registration_code)
      return True
    locked.email_status = Registration.EMAIL_SENDING
    locked.save(update_fields=["email_status", "updated_at"])

  registration.refresh_from_db()
  result = False
  try:
    participants = list(registration.participants.order_by("participant_number"))
    if not participants:
      logger.warning("Participant confirmation email skipped for %s. Participant list is empty.", registration.registration_code)
      return False

    participant_results: list[bool] = []
    participant_recipient_emails: set[str] = set()

    # Send participant confirmations only to participant addresses. A participant
    # may use the same inbox as the admin during testing, so do not suppress it.
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
      sent = _send_emailjs_message_with_fallback(
        participant_email,
        participant_template_id,
        fallback_participant_template_id,
        participant_template_params,
        purpose="PARTICIPANT",
      )
      participant_results.append(sent)

    participant_sent = all(participant_results) if participant_results else True
    result = participant_sent

    logger.info(
      "PARTICIPANT EMAIL DISPATCH RESULT for %s: participant_sent=%s",
      registration.registration_code, participant_sent
    )
    return result
  finally:
    registration.refresh_from_db()
    registration.email_status = Registration.EMAIL_SENT if result else Registration.EMAIL_FAILED
    registration.save(update_fields=["email_status", "updated_at"])
    logger.info(
      "PARTICIPANT EMAIL STATUS for %s: %s",
      registration.registration_code, registration.email_status
    )

def send_participant_payment_rejection(registration) -> bool:
  rejection_template_id = getattr(settings, "EMAILJS_REJECTION_TEMPLATE_ID", "").strip()
  fallback_rejection_template_id = getattr(settings, "EMAILJS_FALLBACK_REJECTION_TEMPLATE_ID", "").strip()

  logger.info(
    "REJECTION EMAIL DISPATCH START for %s: rejection_template=%s fallback_template=%s",
    registration.registration_code,
    rejection_template_id or "(not configured)",
    fallback_rejection_template_id or "(not configured)"
  )

  from django.db import transaction
  with transaction.atomic():
    locked = Registration.objects.select_for_update().get(pk=registration.pk)
    if locked.email_status == Registration.EMAIL_SENDING:
      logger.info("Email already sending for %s, skipping rejection email.", locked.registration_code)
      return True
    locked.email_status = Registration.EMAIL_SENDING
    locked.save(update_fields=["email_status", "updated_at"])

  registration.refresh_from_db()
  result = False
  try:
    participants = list(registration.participants.order_by("participant_number"))
    if not participants:
      logger.warning("Rejection email skipped for %s. Participant list is empty.", registration.registration_code)
      return False

    participant_results: list[bool] = []
    participant_recipient_emails: set[str] = set()

    for participant in participants:
      participant_email = participant.email.strip().lower()
      if not participant_email:
        logger.warning(
          "Rejection email skipped for %s participant %s because the email is missing.",
          registration.registration_code,
          participant.participant_number
        )
        participant_results.append(False)
        continue

      if participant_email in participant_recipient_emails:
        logger.info(
          "Duplicate rejection recipient skipped for %s: %s",
          registration.registration_code,
          participant_email
        )
        continue

      participant_recipient_emails.add(participant_email)
      template_params = _build_registration_template_params(registration, participant, participant_email, "rejection")
      sent = _send_emailjs_message_with_fallback(
        participant_email,
        rejection_template_id,
        fallback_rejection_template_id,
        template_params,
        purpose="PARTICIPANT_REJECTION",
        primary_service_id=getattr(settings, "EMAILJS_REJECTION_SERVICE_ID", "").strip(),
        primary_public_key=getattr(settings, "EMAILJS_REJECTION_PUBLIC_KEY", "").strip(),
        primary_private_key=getattr(settings, "EMAILJS_REJECTION_PRIVATE_KEY", "").strip(),
        fallback_service_id=getattr(settings, "EMAILJS_FALLBACK_REJECTION_SERVICE_ID", "").strip(),
        fallback_public_key=getattr(settings, "EMAILJS_FALLBACK_REJECTION_PUBLIC_KEY", "").strip(),
        fallback_private_key=getattr(settings, "EMAILJS_FALLBACK_REJECTION_PRIVATE_KEY", "").strip()
      )
      participant_results.append(sent)

    result = all(participant_results) if participant_results else False
    logger.info(
      "REJECTION EMAIL DISPATCH RESULT for %s: rejection_sent=%s",
      registration.registration_code,
      result
    )
    return result
  finally:
    registration.refresh_from_db()
    registration.email_status = Registration.EMAIL_SENT if result else Registration.EMAIL_FAILED
    registration.save(update_fields=["email_status", "updated_at"])
    logger.info(
      "REJECTION EMAIL STATUS for %s: %s",
      registration.registration_code, registration.email_status
    )

