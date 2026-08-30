from django.core.management.base import BaseCommand

from events.models import Event


EVENTS = [
  {
    "event_code": "PP",
    "event_name": "Paper Presentation",
    "registration_fee": 250.00
  },
  {
    "event_code": "CB",
    "event_name": "Code Busters",
    "registration_fee": 250.00
  },
  {
    "event_code": "WC",
    "event_name": "Web Craft",
    "registration_fee": 250.00
  },
  {
    "event_code": "VS",
    "event_name": "Visualytics",
    "registration_fee": 250.00
  }
]


class Command(BaseCommand):
  help = "Create or update the default CYBERPUNK'26 event records."

  def handle(self, *args, **options):
    for payload in EVENTS:
      Event.objects.update_or_create(event_code=payload["event_code"], defaults=payload)
    self.stdout.write(self.style.SUCCESS("Event data seeded successfully."))
