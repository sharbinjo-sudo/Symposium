from django.urls import path

from .views import (
  AdminRegistrationClearView,
  AdminRegistrationCreateView,
  AdminRegistrationDeleteView,
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
  path("registrations/create/", AdminRegistrationCreateView.as_view(), name="admin-registration-create"),
  path("registrations/clear/", AdminRegistrationClearView.as_view(), name="admin-registration-clear"),
  path("registrations/", AdminRegistrationListView.as_view(), name="admin-registration-list"),
  path("registrations/export/", AdminRegistrationExportView.as_view(), name="admin-registration-export"),
  path("registrations/<str:registration_code>/", AdminRegistrationDeleteView.as_view(), name="admin-registration-delete"),
  path("registrations/<str:registration_code>/action/", AdminRegistrationActionView.as_view(), name="admin-registration-action"),
  path("registrations/<str:registration_code>/resend-email/", AdminResendEmailView.as_view(), name="admin-registration-resend-email"),
  path("registrations/<str:registration_code>/screenshot/", AdminScreenshotView.as_view(), name="admin-registration-screenshot")
]
