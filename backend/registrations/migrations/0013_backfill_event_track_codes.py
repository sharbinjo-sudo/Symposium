from django.db import migrations


def backfill_event_track_codes(apps, schema_editor):
  Registration = apps.get_model("registrations", "Registration")

  for registration in Registration.objects.prefetch_related("selected_events").all():
    selected_events = list(registration.selected_events.all())
    if not selected_events and registration.event_id:
      selected_events = [registration.event]

    technical_codes = []
    non_technical_codes = []
    for event in selected_events:
      if event.track == "Non-Technical":
        non_technical_codes.append(event.event_code)
      else:
        technical_codes.append(event.event_code)

    Registration.objects.filter(pk=registration.pk).update(
      technical_event_codes=technical_codes,
      non_technical_event_codes=non_technical_codes
    )


class Migration(migrations.Migration):

  dependencies = [
    ("registrations", "0012_registration_event_track_fields"),
  ]

  operations = [
    migrations.RunPython(backfill_event_track_codes, migrations.RunPython.noop),
  ]
