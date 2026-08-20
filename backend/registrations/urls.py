from django.urls import re_path

from .views import RegistrationCreateView, RegistrationPaymentOrderView, RegistrationStatusLookupView

urlpatterns = [
  re_path(r"^$", RegistrationCreateView.as_view(), name="registration-create"),
  re_path(r"^payment-order/?$", RegistrationPaymentOrderView.as_view(), name="registration-payment-order"),
  re_path(r"^status-check/?$", RegistrationStatusLookupView.as_view(), name="registration-status-check")
]
