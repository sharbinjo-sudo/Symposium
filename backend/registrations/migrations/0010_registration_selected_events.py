from django.db import migrations, models


def seed_selected_events(apps, schema_editor):
  Registration = apps.get_model("registrations", "Registration")
  through_model = Registration.selected_events.through

  rows = [
    through_model(registration_id=registration_id, event_id=event_id)
    for registration_id, event_id in Registration.objects.values_list("id", "event_id")
  ]

  through_model.objects.bulk_create(rows, ignore_conflicts=True)


class Migration(migrations.Migration):

  dependencies = [
    ("events", "0001_initial"),
    ("registrations", "0009_remove_payment_gateway_fields"),
  ]

  operations = [
    migrations.AddField(
      model_name="registration",
      name="selected_events",
      field=models.ManyToManyField(blank=True, related_name="multi_event_registrations", to="events.event"),
    ),
    migrations.RunPython(seed_selected_events, migrations.RunPython.noop),
  ]
