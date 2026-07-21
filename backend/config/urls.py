from django.urls import include, path

from .security import csrf_token_view, favicon_view, health_view

urlpatterns = [
  path("", health_view, name="health-root"),
  path("favicon.ico", favicon_view, name="favicon-empty"),
  path("api/security/csrf/", csrf_token_view, name="security-csrf"),
  path("api/events/", include("events.urls")),
  path("api/registrations/", include("registrations.urls")),
  path("api/uploads/", include("uploads.urls")),
  path("api/admin/", include("adminpanel.urls"))
]
