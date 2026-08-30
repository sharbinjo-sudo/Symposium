from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="event",
            name="minimum_team_size",
        ),
        migrations.RemoveField(
            model_name="event",
            name="maximum_team_size",
        ),
        migrations.RemoveField(
            model_name="event",
            name="registration_fee_type",
        ),
    ]
