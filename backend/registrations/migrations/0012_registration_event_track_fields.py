from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("registrations", "0011_remove_team_and_solo_only"),
    ]

    operations = [
        migrations.AddField(
            model_name="registration",
            name="technical_event_codes",
            field=models.JSONField(default=list, blank=True),
        ),
        migrations.AddField(
            model_name="registration",
            name="non_technical_event_codes",
            field=models.JSONField(default=list, blank=True),
        ),
    ]
