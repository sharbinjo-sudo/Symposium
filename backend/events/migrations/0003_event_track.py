from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0002_remove_team_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="track",
            field=models.CharField(
                choices=[("Technical", "Technical"), ("Non-Technical", "Non-Technical")],
                default="Technical",
                max_length=20,
            ),
        ),
    ]
