from django.utils import timezone
from datetime import datetime

from adminpanel.models import AdminUser

SESSION_ADMIN_KEY = "admin_user_id"
# Security: Key to store session creation time for password change validation
SESSION_CREATED_KEY = "admin_session_created_at"


def clear_admin_session(request):
  try:
    request.session.pop(SESSION_ADMIN_KEY, None)
    request.session.pop(SESSION_CREATED_KEY, None)
    request.session.modified = True
  except Exception:
    pass


def set_admin_session(request, admin) -> None:
  """
  Set up admin session with creation timestamp for password change validation.
  """
  request.session[SESSION_ADMIN_KEY] = admin.pk
  request.session[SESSION_CREATED_KEY] = timezone.now().isoformat()


def get_authenticated_admin(request):
  cached_admin = getattr(request, "_cp26_authenticated_admin", None)
  if cached_admin is not None:
    return cached_admin

  admin_id = request.session.get(SESSION_ADMIN_KEY)
  if not admin_id:
    return None

  try:
    admin = AdminUser.objects.get(pk=admin_id, is_active=True)

    # Security: Validate session against password change time
    session_created_str = request.session.get(SESSION_CREATED_KEY)
    if session_created_str:
      try:
        session_created_at = datetime.fromisoformat(session_created_str)
        # Make timezone-aware if needed
        if session_created_at.tzinfo is None:
          session_created_at = session_created_at.replace(tzinfo=timezone.get_current_timezone())

        # Invalidate session if password was changed after session creation
        if not admin.is_session_valid(session_created_at):
          clear_admin_session(request)
          return None
      except (ValueError, TypeError):
        # If we can't parse the session time, invalidate for safety
        clear_admin_session(request)
        return None
    else:
      # No session creation time stored - require re-login for security
      clear_admin_session(request)
      return None

    request._cp26_authenticated_admin = admin
    return admin
  except (AdminUser.DoesNotExist, TypeError, ValueError):
    clear_admin_session(request)
    return None
