from django.urls import re_path

from .views import (
  RegistrationCreateView,
  RegistrationOrderStatusView,
  RegistrationPaymentOrderView,
  RegistrationStatusLookupView
)
from .webhook import cashfree_webhook

urlpatterns = [
  re_path(r"^$", RegistrationCreateView.as_view(), name="registration-create"),
  re_path(r"^payment-order/?$", RegistrationPaymentOrderView.as_view(), name="registration-payment-order"),
  re_path(r"^order-status/?$", RegistrationOrderStatusView.as_view(), name="registration-order-status"),
  re_path(r"^status-check/?$", RegistrationStatusLookupView.as_view(), name="registration-status-check"),
  re_path(r"^webhook/?$", cashfree_webhook, name="cashfree-webhook")
]
