from django.core.management.base import BaseCommand

from events.models import Event


EVENTS = [
  {
    "event_code": "PP",
    "event_name": "Paper Presentation",
    "minimum_team_size": 1,
    "maximum_team_size": 1,
    "registration_fee_type": Event.FEE_TYPE_PER_PARTICIPANT,
    "registration_fee": 250.00
  },
  {
    "event_code": "CB",
    "event_name": "Code Busters",
    "minimum_team_size": 1,
    "maximum_team_size": 2,
    "registration_fee_type": Event.FEE_TYPE_PER_PARTICIPANT,
    "registration_fee": 250.00
  },
  {
    "event_code": "WC",
    "event_name": "Web Craft",
    "minimum_team_size": 1,
    "maximum_team_size": 2,
    "registration_fee_type": Event.FEE_TYPE_PER_TEAM,
    "registration_fee": 250.00
  },
  {
    "event_code": "VS",
    "event_name": "Visualytics",
    "minimum_team_size": 1,
    "maximum_team_size": 2,
    "registration_fee_type": Event.FEE_TYPE_PER_TEAM,
    "registration_fee": 250.00
  }
]


class Command(BaseCommand):
  help = "Create or update the default CYBERPUNK'26 event records."

  def handle(self, *args, **options):
    for payload in EVENTS:
      Event.objects.update_or_create(event_code=payload["event_code"], defaults=payload)
    self.stdout.write(self.style.SUCCESS("Event data seeded successfully."))

