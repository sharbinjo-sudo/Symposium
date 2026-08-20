from django.urls import re_path

from .views import ScreenshotUploadView

urlpatterns = [re_path(r"^screenshot/?$", ScreenshotUploadView.as_view(), name="screenshot-upload")]
