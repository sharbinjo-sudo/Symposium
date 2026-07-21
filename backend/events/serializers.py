from rest_framework import serializers

from .models import Event

EVENT_CONTENT = {
  "PP": {
    "track": "Technical",
    "summary": "Present an original concept, product idea, or research insight with clarity and confidence.",
    "description": (
      "Single-participant presentation round focused on CSE and AI & DS domains. Each participant gets ten "
      "minutes to present with slides, followed by questions from the panel."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: 1st, 2nd, and 3rd place"
    ],
    "rules": [
      "Topics can belong to CSE, AI & DS, or closely related computing domains.",
      "Only one participant is allowed per entry.",
      "Presentation time is 10 minutes, followed by a short Q&A round.",
      "Participants must bring their presentation on a pendrive."
    ]
  },
  "CB": {
    "track": "Technical",
    "summary": "Solve logic-heavy coding challenges under pressure without using AI tools.",
    "description": (
      "Two-member coding event with a written screening round followed by a live implementation round using "
      "languages such as Python, C, or Java."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: 1st, 2nd, and 3rd place"
    ],
    "rules": [
      "Each team can have up to 2 participants.",
      "Round 1 is a written problem-solving round for shortlisting.",
      "Round 2 is a live coding round using Python, C, or Java.",
      "Phones and AI tools are prohibited during the event."
    ]
  },
  "WC": {
    "track": "Technical",
    "summary": "Design and build an interactive frontend experience from a surprise brief.",
    "description": (
      "Frontend development round where teams build a multi-page interface from a random prompt. AI-assisted "
      "workflows are allowed for this event."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: 1st, 2nd, and 3rd place"
    ],
    "rules": [
      "Each team can have up to 2 participants.",
      "The challenge focuses on frontend-only implementation across multiple pages.",
      "Teams receive a surprise idea or brief during the event.",
      "AI tools may be used for this round."
    ]
  },
  "VS": {
    "track": "Technical",
    "summary": "Turn raw company datasets into persuasive insights through visual storytelling.",
    "description": (
      "Data analysis and visualization event where teams explore random datasets and present the clearest, "
      "most attractive analytical story using charts and dashboards."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: 1st, 2nd, and 3rd place"
    ],
    "rules": [
      "Each team can have up to 2 participants.",
      "Random datasets are provided during the event.",
      "Participants may use Python, dashboard tools, or AI-assisted workflows.",
      "The most detailed, accurate, and compelling visual story wins."
    ]
  }
}


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

  def get_track(self, event: Event) -> str:
    content = EVENT_CONTENT.get(event.event_code, {})
    return content.get("track", "Technical")

  def get_summary(self, obj: Event) -> str:
    content = EVENT_CONTENT.get(obj.event_code, {})
    return content.get(
      "summary",
      f"{obj.event_name} registration with {obj.minimum_team_size}-{obj.maximum_team_size} participant slots."
    )

  def get_description(self, obj: Event) -> str:
    content = EVENT_CONTENT.get(obj.event_code, {})
    return content.get("description", f"Config-driven event record for {obj.event_name}.")

  def get_prizes(self, event: Event) -> list[str]:
    content = EVENT_CONTENT.get(event.event_code, {})
    return content.get("prizes", [])

  def get_rules(self, event: Event) -> list[str]:
    content = EVENT_CONTENT.get(event.event_code, {})
    return content.get("rules", [])
