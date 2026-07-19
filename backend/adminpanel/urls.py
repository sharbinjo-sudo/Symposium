from django.urls import path

from .views import (
  AdminDashboardSummaryView,
  AdminLoginView,
  AdminLogoutView,
  AdminRegistrationActionView,
  AdminRegistrationExportView,
  AdminRegistrationListView,
  AdminResendEmailView,
  AdminScreenshotView
)

urlpatterns = [
  path("auth/login/", AdminLoginView.as_view(), name="admin-login"),
  path("auth/logout/", AdminLogoutView.as_view(), name="admin-logout"),
  path("dashboard/summary/", AdminDashboardSummaryView.as_view(), name="admin-dashboard-summary"),
  path("registrations/", AdminRegistrationListView.as_view(), name="admin-registration-list"),
  path("registrations/export/", AdminRegistrationExportView.as_view(), name="admin-registration-export"),
  path("registrations/<str:registration_code>/action/", AdminRegistrationActionView.as_view(), name="admin-registration-action"),
  path("registrations/<str:registration_code>/resend-email/", AdminResendEmailView.as_view(), name="admin-registration-resend-email"),
  path("registrations/<str:registration_code>/screenshot/", AdminScreenshotView.as_view(), name="admin-registration-screenshot")
]
