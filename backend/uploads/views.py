from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.security import apply_no_store
from .storage import save_payment_proof


class ScreenshotUploadView(APIView):
  parser_classes = [MultiPartParser]
  throttle_classes = [ScopedRateThrottle]
  throttle_scope = "upload_submit"

  def post(self, request):
    uploaded_file = request.FILES.get("file")
    if uploaded_file is None:
      return apply_no_store(Response({"detail": "Missing file."}, status=status.HTTP_400_BAD_REQUEST))

    if uploaded_file.size > 5 * 1024 * 1024:
      return apply_no_store(Response({"detail": "Maximum file size is 5 MB."}, status=status.HTTP_400_BAD_REQUEST))

    try:
      upload_token = save_payment_proof(uploaded_file)
    except ValueError as exc:
      return apply_no_store(Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST))

    return apply_no_store(Response({"uploadToken": upload_token}, status=status.HTTP_201_CREATED))
