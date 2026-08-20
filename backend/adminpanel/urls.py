from django.urls import re_path

from .views import (
  AdminRegistrationCreateView,
  AdminRegistrationDeleteView,
  AdminDashboardSummaryView,
  AdminLoginView,
  AdminLogoutView,
  AdminSessionView,
  AdminRegistrationActionView,
  AdminRegistrationExportView,
  AdminRegistrationListView,
  AdminResendEmailView,
  AdminScreenshotView
)

urlpatterns = [
  re_path(r"^auth/login/?$", AdminLoginView.as_view(), name="admin-login"),
  re_path(r"^auth/logout/?$", AdminLogoutView.as_view(), name="admin-logout"),
  re_path(r"^auth/session/?$", AdminSessionView.as_view(), name="admin-session"),
  re_path(r"^dashboard/summary/?$", AdminDashboardSummaryView.as_view(), name="admin-dashboard-summary"),
  re_path(r"^registrations/create/?$", AdminRegistrationCreateView.as_view(), name="admin-registration-create"),
  re_path(r"^registrations/?$", AdminRegistrationListView.as_view(), name="admin-registration-list"),
  re_path(r"^registrations/export/?$", AdminRegistrationExportView.as_view(), name="admin-registration-export"),
  re_path(
    r"^registrations/(?P<registration_code>[A-Z0-9-]+)/?$",
    AdminRegistrationDeleteView.as_view(),
    name="admin-registration-delete"
  ),
  re_path(
    r"^registrations/(?P<registration_code>[A-Z0-9-]+)/action/?$",
    AdminRegistrationActionView.as_view(),
    name="admin-registration-action"
  ),
  re_path(
    r"^registrations/(?P<registration_code>[A-Z0-9-]+)/resend-email/?$",
    AdminResendEmailView.as_view(),
    name="admin-registration-resend-email"
  ),
  re_path(
    r"^registrations/(?P<registration_code>[A-Z0-9-]+)/screenshot/?$",
    AdminScreenshotView.as_view(),
    name="admin-registration-screenshot"
  )
]
