from django.core.management.base import BaseCommand

from events.models import Event


EVENTS = [
  {
    "event_code": "PP",
    "event_name": "Paper Presentation",
    "track": "Technical",
    "registration_fee": 250.00
  },
  {
    "event_code": "CB",
    "event_name": "Code Busters",
    "track": "Technical",
    "registration_fee": 250.00
  },
  {
    "event_code": "WC",
    "event_name": "Web Craft",
    "track": "Technical",
    "registration_fee": 250.00
  },
  {
    "event_code": "VS",
    "event_name": "Visualytics",
    "track": "Technical",
    "registration_fee": 250.00
  },
  {
    "event_code": "EC",
    "event_name": "Expression Challenge",
    "track": "Non-Technical",
    "registration_fee": 250.00
  },
  {
    "event_code": "MQ",
    "event_name": "Mystery Quest",
    "track": "Non-Technical",
    "registration_fee": 250.00
  },
  {
    "event_code": "CC",
    "event_name": "Connection Challenge",
    "track": "Non-Technical",
    "registration_fee": 250.00
  },
  {
    "event_code": "VI",
    "event_name": "Visual Insight",
    "track": "Non-Technical",
    "registration_fee": 250.00
  }
]


class Command(BaseCommand):
  help = "Create or update the default CYBERPUNK'26 event records."

  def handle(self, *args, **options):
    for payload in EVENTS:
      Event.objects.update_or_create(event_code=payload["event_code"], defaults=payload)
    self.stdout.write(self.style.SUCCESS("Event data seeded successfully."))
