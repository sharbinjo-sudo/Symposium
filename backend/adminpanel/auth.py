from adminpanel.models import AdminUser


SESSION_ADMIN_KEY = "admin_user_id"


def clear_admin_session(request):
  try:
    request.session.pop(SESSION_ADMIN_KEY, None)
    request.session.modified = True
  except Exception:
    pass


def get_authenticated_admin(request):
  cached_admin = getattr(request, "_cp26_authenticated_admin", None)
  if cached_admin is not None:
    return cached_admin

  admin_id = request.session.get(SESSION_ADMIN_KEY)
  if not admin_id:
    return None

  try:
    admin = AdminUser.objects.get(pk=admin_id, is_active=True)
    request._cp26_authenticated_admin = admin
    return admin
  except (AdminUser.DoesNotExist, TypeError, ValueError):
    clear_admin_session(request)
    return None
