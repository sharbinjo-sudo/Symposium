from django.urls import re_path

from .views import (
  RegistrationCreateView,
  RegistrationStatusLookupView
)

urlpatterns = [
  re_path(r"^$", RegistrationCreateView.as_view(), name="registration-create"),
  re_path(r"^status-check/?$", RegistrationStatusLookupView.as_view(), name="registration-status-check")
]
