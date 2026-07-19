from django.urls import path

from .views import ScreenshotUploadView

urlpatterns = [path("screenshot/", ScreenshotUploadView.as_view(), name="screenshot-upload")]

