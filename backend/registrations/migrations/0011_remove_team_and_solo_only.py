from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("registrations", "0010_registration_selected_events"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="registration",
            name="team_name",
        ),
        migrations.RemoveField(
            model_name="registration",
            name="team_size",
        ),
        migrations.RemoveField(
            model_name="participant",
            name="is_team_leader",
        ),
    ]
