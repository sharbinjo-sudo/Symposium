import type { SiteConfig } from "@/lib/types";

export const siteConfig: SiteConfig = {
  eventTitle: "CYBERPUNK'26",
  heroSubtitle: "AI & Data Science Symposium",
  themeTagline: "Built for curious coders, sharp presenters, and data storytellers.",
  eventDate: process.env.NEXT_PUBLIC_EVENT_DATE ?? "2026-09-12T09:00:00+05:30",
  registrationDeadline: "2026-09-10T23:59:00+05:30",
  venue: "V V College of Engineering",
  venueDetail: "V V Nagar, Arasoor, Tisaiyanvilai (Via), Sathankulam Taluk, Thoothukudi District - 628 656",
  heroCopy:
    "An innovation symposium shaped like a future-facing product launch: elegant event discovery, guided registrations, and a trustworthy organizer workflow in one unified experience.",
  about:
    "CYBERPUNK'26 is a campus-led technology symposium shaped around hands-on competition, presentation skill, and creative problem solving. The experience is structured to keep registrations, event communication, and organizer review clear from the first visit to final verification.",
  facilitiesNote:
    "Computer lab availability, projector support, and event-room allocations are surfaced as editable content instead of hardcoded layout text.",
  contacts: [
    { label: "Organizing Committee", value: "CYBERPUNK'26 Organizing Committee" },
    { label: "Help Desk", value: "Organizer support during registration and event-day operations" },
    { label: "Email", value: "sharbinjo@gmail.com" }
  ],
  highlights: [
    "6-step registration wizard with review and confirmation",
    "Razorpay-backed payment confirmation for participants",
    "Responsive public pages and session-based admin shell"
  ],
  heroStats: [
    { value: "04", label: "Technical events" },
    { value: "06", label: "Guided registration steps" },
    { value: "24/7", label: "Organizer-ready digital flow" }
  ],
  technicalEvents: [
    {
      order: 1,
      code: "PP",
      name: "Paper Presentation",
      track: "Technical",
      summary: "Present an original concept, product idea, or research insight with clarity and confidence.",
      description:
        "A single-participant event focused on strong storytelling, technical structure, and visual communication.",
      visualTitle: "Floating decks and idea layers",
      accent: "blue-violet",
      visualTags: ["Slide narrative", "Idea framing", "Presentation polish"],
      minTeamSize: 1,
      maxTeamSize: 1,
      feeType: "per_participant",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: 1st, 2nd, and 3rd place"],
      rules: [
        "One participant per registration.",
        "Bring a concise slide deck and a focused abstract.",
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
      summary: "Solve logic-heavy coding challenges under pressure.",
      description: "Teams of up to two race through debugging, algorithms, and hidden test cases.",
      visualTitle: "Logic nodes and clean code motion",
      accent: "cyan-blue",
      visualTags: ["Algorithm rounds", "Debug sprints", "Logic trails"],
      minTeamSize: 1,
      maxTeamSize: 2,
      feeType: "per_participant",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: 1st, 2nd, and 3rd place"],
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
      summary: "Design and build an interactive web experience from a surprise brief.",
      description: "A frontend-focused challenge where teams build for usability, speed, and originality.",
      visualTitle: "Layered browsers and responsive frames",
      accent: "violet-teal",
      visualTags: ["Responsive UI", "Component systems", "Interface craft"],
      minTeamSize: 1,
      maxTeamSize: 2,
      feeType: "per_team",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: 1st, 2nd, and 3rd place"],
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
      summary: "Turn raw data into persuasive insights through visualization and narrative.",
      description: "Configurable team-size event for analytics, dashboards, and visual storytelling.",
      visualTitle: "Data arcs and dashboard motion",
      accent: "teal-blue",
      visualTags: ["Visual stories", "Chart thinking", "Insight design"],
      minTeamSize: 1,
      maxTeamSize: 2,
      feeType: "per_team",
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: 1st, 2nd, and 3rd place"],
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
      name: "Icebreaker Arena",
      summary: "A fast-paced audience participation activity designed to open the symposium with energy and interaction."
    },
    {
      name: "Spotlight Sprint",
      summary: "A short stage challenge focused on confidence, spontaneity, and student presence before a live crowd."
    },
    {
      name: "Pixel Parade",
      summary: "A creative participation segment that highlights visual flair, campus spirit, and collaborative fun."
    }
  ]
};
