from django.urls import path

from .views import RegistrationCreateView, RegistrationPaymentOrderView

urlpatterns = [
  path("", RegistrationCreateView.as_view(), name="registration-create"),
  path("payment-order/", RegistrationPaymentOrderView.as_view(), name="registration-payment-order")
]
