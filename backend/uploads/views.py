from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.security import apply_no_store


class ScreenshotUploadView(APIView):
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "upload_submit"

  def post(self, request):
    return apply_no_store(
      Response(
        {"detail": "Payment proof uploads are disabled. Please complete payment through Cashfree checkout."},
        status=status.HTTP_410_GONE
      )
    )
