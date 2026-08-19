import type { SiteConfig } from "@/lib/types";

export const siteConfig: SiteConfig = {
  eventTitle: "CYBERPUNK'26",
  heroSubtitle: "National Level AI & Data Science Symposium",
  themeTagline: "VV College of Engineering welcomes all engineering students to CYBERPUNK'26.",
  eventDate: process.env.NEXT_PUBLIC_EVENT_DATE ?? "2026-09-11T09:30:00+05:30",
  registrationDeadline: "2026-09-10T23:59:00+05:30",
  venue: "V V College of Engineering",
  venueDetail: "V V Nagar, Tisaiyanvillai - 627657",
  heroCopy:
    "A national-level technical symposium featuring technical and non-technical events for solo or team participation. Registration fee: ₹250 per member.",
  about:
    "CYBERPUNK'26 is a national-level technical symposium organized by the Department of Artificial Intelligence and Data Science, V V College of Engineering. The symposium starts at 9:30 AM on September 11, 2026, with technical and non-technical events for solo or team participation.",
  facilitiesNote:
    "V V College of Engineering is approved by AICTE, New Delhi and affiliated to Anna University, Chennai. The event venue is V V College of Engineering, Tisaiyanvillai.",
  contacts: [
    { label: "Convener", value: "Mrs. Merlin Gethsy. D, HOD/AI&DS" },
    { label: "Co-ordinator", value: "Mrs. Shanthi. S, AP/AI&DS" },
    { label: "Student Co-ordinator", value: "Vanni Venkatesh. R" },
    { label: "Student Co-ordinator", value: "Chendur Priya. B" },
    { label: "Event Contact", value: "8056591486" },
    { label: "Mail ID", value: "cyberpunk26aids@gmail.com" }
  ],
  highlights: [
    "National-level technical symposium hosted by the Department of AI & DS",
    "Open to all engineering students",
    "Solo or team participation available",
    "Registration fee: ₹250 per member",
    "Registration end date: September 10, 2026"
  ],
  heroStats: [
    { value: "04", label: "Technical events" },
    { value: "03", label: "Non-technical events" },
    { value: "250", label: "Registration fee" }
  ],
  technicalEvents: [
    {
      order: 1,
      code: "PP",
      name: "Paper Presentation",
      track: "Technical",
      summary: "Present a technical idea, project, or research concept with clarity and confidence.",
      description:
        "A presentation event for students to explain original ideas, project work, research directions, or technical concepts before the panel.",
      visualTitle: "Floating decks and idea layers",
      accent: "blue-violet",
      visualTags: ["Slide narrative", "Idea framing", "Presentation polish"],
      minTeamSize: 1,
      maxTeamSize: 1,
      feeType: "per_participant",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "Solo participation is supported.",
        "Bring a concise slide deck and a focused abstract or topic note.",
        "Judging weighs originality, delivery, and practical relevance."
      ],
      importantNotes: [
        {
          tone: "required",
          title: "Bring your presentation",
          description: "Carry the final slide deck on a pen drive and keep a backup in your email."
        },
        {
          tone: "info",
          title: "Speaking window",
          description: "Each participant receives a short presentation slot followed by questions from the panel."
        }
      ],
      registrationOpen: true
    },
    {
      order: 2,
      code: "CB",
      name: "Code Busters",
      track: "Technical",
      summary: "Solve programming, debugging, and logic challenges under event-day pressure.",
      description: "A coding challenge for solo participants or teams, focused on problem solving, debugging discipline, and implementation clarity.",
      visualTitle: "Logic nodes and clean code motion",
      accent: "cyan-blue",
      visualTags: ["Algorithm rounds", "Debug sprints", "Logic trails"],
      minTeamSize: 1,
      maxTeamSize: 2,
      feeType: "per_participant",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "Solo entries and 2-member teams are allowed.",
        "Languages and platform instructions are shared on event day.",
        "Any external assistance leads to disqualification."
      ],
      importantNotes: [
        {
          tone: "prohibited",
          title: "No external help",
          description: "Phones, AI tools, and outside collaboration are not allowed during the contest window."
        },
        {
          tone: "warning",
          title: "Platform timing",
          description: "Submission closes immediately at the final buzzer, even if a team is still typing."
        }
      ],
      registrationOpen: true
    },
    {
      order: 3,
      code: "WC",
      name: "Web Craft",
      track: "Technical",
      summary: "Craft a functional web experience with clean interface thinking and responsive execution.",
      description: "A web development event for solo participants or teams to turn a given idea into a useful, readable, and presentable web interface.",
      visualTitle: "Layered browsers and responsive frames",
      accent: "violet-teal",
      visualTags: ["Responsive UI", "Component systems", "Interface craft"],
      minTeamSize: 1,
      maxTeamSize: 2,
      feeType: "per_participant",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "One or two participants per team.",
        "Judging covers UI quality, responsiveness, and completeness.",
        "Teams must present their final output to the panel."
      ],
      importantNotes: [
        {
          tone: "required",
          title: "Demo ready build",
          description: "Teams should be ready to show their final project running during the review window."
        },
        {
          tone: "info",
          title: "Judging criteria",
          description: "Visual quality matters, but performance, usability, and clarity matter just as much."
        }
      ],
      registrationOpen: true
    },
    {
      order: 4,
      code: "VS",
      name: "Visualytics",
      track: "Technical",
      summary: "Transform data into visual insight through charts, dashboards, and storytelling.",
      description: "A data visualization and analytics event where participants convert information into clear visual stories and explain their decisions.",
      visualTitle: "Data arcs and dashboard motion",
      accent: "teal-blue",
      visualTags: ["Visual stories", "Chart thinking", "Insight design"],
      minTeamSize: 1,
      maxTeamSize: 2,
      feeType: "per_participant",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "Use charts intentionally and explain your decisions.",
        "Submission quality matters as much as accuracy.",
        "Teams must stay within the announced participant limit for the event."
      ],
      importantNotes: [
        {
          tone: "warning",
          title: "Story over noise",
          description: "Overcrowded dashboards reduce clarity. Build toward one strong insight trail."
        },
        {
          tone: "required",
          title: "Explain your charts",
          description: "Judges expect participants to defend visualization choices, not just show the output."
        }
      ],
      registrationOpen: true
    }
  ],
  nonTechnicalEvents: [
    {
      name: "Guess the Lyrics",
      summary: "A lively music-based stage event where participants identify songs from lyric clues and quick prompts."
    },
    {
      name: "Bioscope",
      summary: "A cinema-inspired campus activity built around visual clues, quick recognition, and audience energy."
    },
    {
      name: "Word Battle",
      summary: "A fast word-play challenge that tests vocabulary, presence of mind, and friendly competitive spirit."
    }
  ]
};
