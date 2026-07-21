from django.urls import path

from .views import RegistrationCreateView, RegistrationPaymentOrderView, RegistrationStatusLookupView

urlpatterns = [
  path("", RegistrationCreateView.as_view(), name="registration-create"),
  path("payment-order/", RegistrationPaymentOrderView.as_view(), name="registration-payment-order"),
  path("status-check/", RegistrationStatusLookupView.as_view(), name="registration-status-check")
]
