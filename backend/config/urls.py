from django.urls import include, path, re_path

from .security import csrf_token_view, favicon_view, health_view

urlpatterns = [
  path("", health_view, name="health-root"),
  path("favicon.ico", favicon_view, name="favicon-empty"),
  re_path(r"^api/security/csrf/?$", csrf_token_view, name="security-csrf"),
  re_path(r"^api/events(?:/|$)", include("events.urls")),
  re_path(r"^api/registrations(?:/|$)", include("registrations.urls")),
  re_path(r"^api/uploads(?:/|$)", include("uploads.urls")),
  re_path(r"^api/admin(?:/|$)", include("adminpanel.urls"))
]
