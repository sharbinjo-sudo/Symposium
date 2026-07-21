from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie


def apply_no_store(response):
  response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
  response["Pragma"] = "no-cache"
  response["Expires"] = "0"
  return response


@never_cache
@ensure_csrf_cookie
def csrf_token_view(request):
  response = JsonResponse({"csrfToken": get_token(request)})
  return apply_no_store(response)


@never_cache
def health_view(request):
  response = JsonResponse({"ok": True, "service": "cyberpunk26-backend"})
  return apply_no_store(response)


@never_cache
def favicon_view(request):
  response = HttpResponse(status=204)
  return apply_no_store(response)
