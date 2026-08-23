import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone

from .models import PaymentAttempt, Registration
from .services import verify_webhook_signature

logger = logging.getLogger("registrations")


@csrf_exempt
@require_POST
def cashfree_webhook(request):
  """Handle Cashfree payment webhooks."""
  timestamp = request.headers.get("x-webhook-timestamp", "")
  signature = request.headers.get("x-webhook-signature", "")

  if not timestamp or not signature:
    logger.warning("Cashfree webhook missing timestamp or signature headers.")
    return JsonResponse({"status": "error", "message": "Missing headers"}, status=400)

  raw_body = request.body.decode("utf-8", errors="replace")

  if not verify_webhook_signature(timestamp, raw_body, signature):
    logger.warning("Cashfree webhook signature verification failed.")
    return JsonResponse({"status": "error", "message": "Invalid signature"}, status=401)

  try:
    payload = json.loads(raw_body)
  except json.JSONDecodeError:
    logger.warning("Cashfree webhook received invalid JSON.")
    return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)

  event_type = payload.get("type", "")
  data = payload.get("data", {})
  order = data.get("order", {})
  payment = data.get("payment", {})

  order_id = order.get("order_id", "")
  order_status = order.get("order_status", "")
  payment_status = payment.get("payment_status", "")
  cf_payment_id = payment.get("cf_payment_id", "")

  logger.info(f"Cashfree webhook: type={event_type} order_id={order_id} status={order_status} payment_status={payment_status}")

  if not order_id:
    logger.warning("Cashfree webhook missing order_id.")
    return JsonResponse({"status": "ok"}, status=200)

  # Update payment attempt
  try:
    payment_attempt = PaymentAttempt.objects.get(order_id=order_id)
  except PaymentAttempt.DoesNotExist:
    logger.warning(f"Cashfree webhook for unknown order: {order_id}")
    return JsonResponse({"status": "ok"}, status=200)

  if event_type in ("PAYMENT_SUCCESS_WEBHOOK",):
    payment_attempt.payment_id = cf_payment_id or payment_attempt.payment_id
    payment_attempt.status = PaymentAttempt.STATUS_CAPTURED
    payment_attempt.save(update_fields=["payment_id", "status", "updated_at"])
    logger.info(f"Cashfree webhook: order {order_id} marked as captured.")
  elif event_type in ("PAYMENT_FAILED_WEBHOOK",):
    payment_attempt.payment_id = cf_payment_id or payment_attempt.payment_id
    payment_attempt.status = PaymentAttempt.STATUS_FAILED
    payment_attempt.save(update_fields=["payment_id", "status", "updated_at"])
    logger.info(f"Cashfree webhook: order {order_id} marked as failed.")
  elif event_type in ("PAYMENT_USER_DROPPED_WEBHOOK",):
    payment_attempt.status = PaymentAttempt.STATUS_FAILED
    payment_attempt.save(update_fields=["status", "updated_at"])
    logger.info(f"Cashfree webhook: order {order_id} user dropped.")

  return JsonResponse({"status": "ok"}, status=200)
