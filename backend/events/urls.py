from django.urls import re_path

from .views import EventListView

urlpatterns = [re_path(r"^$", EventListView.as_view(), name="event-list")]
