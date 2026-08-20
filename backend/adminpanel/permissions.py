from rest_framework.permissions import BasePermission

from .auth import get_authenticated_admin


class IsAuthenticatedAdmin(BasePermission):
  message = "Admin session expired. Please sign in again."

  def has_permission(self, request, view):
    admin = get_authenticated_admin(request)
    if admin is None:
      return False

    request.admin_user = admin
    return True

