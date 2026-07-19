from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
  code = serializers.CharField(source="event_code")
  name = serializers.CharField(source="event_name")
  minTeamSize = serializers.IntegerField(source="minimum_team_size")
  maxTeamSize = serializers.IntegerField(source="maximum_team_size")
  feeType = serializers.CharField(source="registration_fee_type")
  feeAmount = serializers.DecimalField(source="registration_fee", max_digits=8, decimal_places=2)
  registrationOpen = serializers.BooleanField(source="is_registration_open")
  summary = serializers.SerializerMethodField()
  description = serializers.SerializerMethodField()
  track = serializers.SerializerMethodField()
  prizes = serializers.SerializerMethodField()
  rules = serializers.SerializerMethodField()

  class Meta:
    model = Event
    fields = [
      "code",
      "name",
      "track",
      "summary",
      "description",
      "minTeamSize",
      "maxTeamSize",
      "feeType",
      "feeAmount",
      "registrationOpen",
      "prizes",
      "rules"
    ]

  def get_track(self, _: Event) -> str:
    return "Technical"

  def get_summary(self, obj: Event) -> str:
    return f"{obj.event_name} registration with {obj.minimum_team_size}-{obj.maximum_team_size} participant slots."

  def get_description(self, obj: Event) -> str:
    return f"Config-driven event record for {obj.event_name}."

  def get_prizes(self, _: Event) -> list[str]:
    return []

  def get_rules(self, _: Event) -> list[str]:
    return []

