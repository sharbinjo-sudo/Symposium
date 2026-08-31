from rest_framework import serializers

from .models import Event

EVENT_CONTENT = {
  "PP": {
    "track": "Technical",
    "summary": "Present a technical idea, project, or research concept with clarity and confidence.",
    "description": (
      "Presentation event for students to explain original ideas, project work, research directions, or technical "
      "concepts before the panel."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: All registered participants"
    ],
    "rules": [
      "Individual participation is supported.",
      "Bring a concise slide deck and a focused abstract or topic note.",
      "Judging weighs originality, delivery, and practical relevance.",
      "Participants must carry their presentation files on event day."
    ]
  },
  "CB": {
    "track": "Technical",
    "summary": "Solve programming, debugging, and logic challenges under event-day pressure.",
    "description": (
      "Coding challenge for individual participants, focused on problem solving, debugging discipline, and "
      "implementation clarity."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: All registered participants"
    ],
    "rules": [
      "Each participant must register individually.",
      "Round 1 is a written problem-solving round for shortlisting.",
      "Round 2 is a live coding round using Python, C, or Java.",
      "Phones and AI tools are prohibited during the event."
    ]
  },
  "WC": {
    "track": "Technical",
    "summary": "Craft a functional web experience with clean interface thinking and responsive execution.",
    "description": (
      "Web development event for individual participants to turn a given idea into a useful, readable, and "
      "presentable web interface."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: All registered participants"
    ],
    "rules": [
      "Each participant must register individually.",
      "The challenge focuses on frontend-only implementation across multiple pages.",
      "Participants receive a surprise idea or brief during the event.",
      "AI tools may be used for this round."
    ]
  },
  "VS": {
    "track": "Technical",
    "summary": "Transform data into visual insight through charts, dashboards, and storytelling.",
    "description": (
      "Data visualization and analytics event where participants convert information into clear visual stories and "
      "explain their decisions."
    ),
    "prizes": [
      "First Prize: Rs. 1,000",
      "Second Prize: Rs. 500",
      "Certificates: All registered participants"
    ],
    "rules": [
      "Each participant must register individually.",
      "Random datasets are provided during the event.",
      "Participants may use Python, dashboard tools, or AI-assisted workflows.",
      "The most detailed, accurate, and compelling visual story wins."
    ]
  },
  "EC": {
    "track": "Non-Technical",
    "summary": "Use body language and expressions to communicate prompts under a time limit.",
    "description": "A stage-based expression and guessing event focused on creativity, coordination, and quick thinking.",
    "prizes": [],
    "rules": [
      "Participants must follow the event format announced on campus.",
      "Speaking, mouthing words, spelling, and direct clues are not allowed.",
      "Points are awarded for correct answers within the time limit."
    ]
  },
  "MQ": {
    "track": "Non-Technical",
    "summary": "Decode clues through sketching and one-word hints across timed rounds.",
    "description": "A mystery clue challenge focused on creativity, communication, and teamwork.",
    "prizes": [],
    "rules": [
      "Participants must follow the sketching and clue-giving restrictions announced on campus.",
      "Letters, numbers, symbols, spelling, rhyming, and direct clues are not allowed where restricted.",
      "Scores from all rounds are combined to determine winners."
    ]
  },
  "CC": {
    "track": "Non-Technical",
    "summary": "Identify the common word connecting multiple images shown on screen.",
    "description": "A visual connection challenge focused on observation, logic, and quick interpretation.",
    "prizes": [],
    "rules": [
      "Participants answer image-based connection questions under the announced format.",
      "Wrong direct and challenge answers may carry penalties.",
      "Electronic devices and external assistance are not allowed."
    ]
  },
  "VI": {
    "track": "Non-Technical",
    "summary": "Create and present an original story based on a displayed picture.",
    "description": "A creative storytelling event focused on observation, imagination, and presentation.",
    "prizes": [],
    "rules": [
      "Stories must directly relate to the displayed image.",
      "Participants must follow the preparation and presentation time limits.",
      "Electronic devices and external assistance are not allowed during preparation."
    ]
  }
}


class EventSerializer(serializers.ModelSerializer):
  code = serializers.CharField(source="event_code")
  name = serializers.CharField(source="event_name")
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
      "feeAmount",
      "registrationOpen",
      "prizes",
      "rules"
    ]

  def get_track(self, event: Event) -> str:
    return getattr(event, "track", "Technical")

  def get_summary(self, obj: Event) -> str:
    content = EVENT_CONTENT.get(obj.event_code, {})
    return content.get(
      "summary",
      f"{obj.event_name} registration."
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
