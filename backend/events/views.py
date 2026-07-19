from rest_framework.generics import ListAPIView

from .models import Event
from .serializers import EventSerializer


class EventListView(ListAPIView):
  queryset = Event.objects.all().order_by("event_code")
  serializer_class = EventSerializer
