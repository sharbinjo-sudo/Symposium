from adminpanel.models import AdminUser


SESSION_ADMIN_KEY = "admin_user_id"


def get_authenticated_admin(request):
  admin_id = request.session.get(SESSION_ADMIN_KEY)
  if not admin_id:
    return None

  try:
    return AdminUser.objects.get(pk=admin_id, is_active=True)
  except AdminUser.DoesNotExist:
    return None

