from django.urls import re_path

from .views import (
  RegistrationCreateView,
  RegistrationPrecheckView,
  RegistrationStatusLookupView
)

urlpatterns = [
  re_path(r"^$", RegistrationCreateView.as_view(), name="registration-create"),
  re_path(r"^precheck/?$", RegistrationPrecheckView.as_view(), name="registration-precheck"),
  re_path(r"^status-check/?$", RegistrationStatusLookupView.as_view(), name="registration-status-check")
]
