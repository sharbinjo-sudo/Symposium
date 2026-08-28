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
  paymentScannerImage: process.env.NEXT_PUBLIC_PAYMENT_SCANNER_IMAGE ?? "",
  paymentReceiverName: process.env.NEXT_PUBLIC_PAYMENT_RECEIVER_NAME ?? "CYBERPUNK'26 Registration",
  highlights: [
    "National-level technical symposium hosted by the Department of AI & DS",
    "Open to all engineering students",
    "Solo or team participation available",
    "Registration fee: ₹250 per member",
    "Registration end date: September 10, 2026"
  ],
  heroStats: [
    { value: "04", label: "Technical events" },
    { value: "04", label: "Non-technical events" },
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
        "This is a solo event. Each participant must register individually for Paper Presentation.",
        "Participants should prepare a clear slide deck based on a technical idea, project, research concept, or innovation.",
        "The presentation must be concise and should cover the problem statement, proposed solution, methodology, outcome, and practical relevance.",
        "Participants must carry the final presentation file on a pen drive and should also keep a backup copy in email or cloud storage.",
        "Each participant will be given a fixed presentation slot followed by questions from the judging panel.",
        "Judging will be based on originality, technical depth, presentation clarity, confidence, time management, and relevance of the topic.",
        "Content copied directly from online sources without proper understanding may lead to score reduction.",
        "Participants must report to the event venue before the allotted time and follow the instructions given by the coordinators."
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
        "Solo entries and teams of 2 members are allowed.",
        "The event will include programming, debugging, logic-building, and problem-solving challenges.",
        "Programming languages, platform details, input-output format, and submission instructions will be shared by the coordinators on event day.",
        "Participants must complete each challenge within the announced time limit.",
        "Solutions will be evaluated based on correctness, efficiency, logic, code clarity, and successful execution.",
        "Use of phones, internet search, AI tools, external devices, or outside collaboration is strictly prohibited during the contest.",
        "Any form of malpractice, sharing answers, or copying code from another participant or team will lead to disqualification.",
        "The final score may consider solved problems, test-case success, execution time, and tie-breaker criteria announced by the organizers."
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
        "Solo participants and teams of 2 members are allowed.",
        "Participants will be given a web development task, theme, or problem statement during the event.",
        "The final output should be functional, readable, responsive, and aligned with the given task.",
        "Teams may use standard frontend technologies and tools permitted by the coordinators on event day.",
        "The interface should work properly on common screen sizes and should avoid broken layouts, unreadable text, and incomplete navigation.",
        "Judging will cover UI quality, responsiveness, usability, creativity, completeness, code organization, and presentation of the final output.",
        "Participants must be ready to demonstrate the working project and explain their design and implementation decisions to the panel.",
        "Submissions made after the announced deadline may not be considered for evaluation."
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
        "Solo participants and teams of 2 members are allowed.",
        "Participants will work with a dataset, prompt, or analytics scenario provided during the event.",
        "The goal is to convert raw information into meaningful visual insights using charts, dashboards, summaries, or visual stories.",
        "Charts must be selected intentionally and should match the type of data and insight being communicated.",
        "Participants should avoid overcrowded dashboards and should focus on clarity, accuracy, and a strong insight flow.",
        "Judging will be based on data understanding, visual clarity, correctness, storytelling, design choices, and explanation of the final output.",
        "Teams must be able to explain why they chose specific charts, metrics, filters, or visual structures.",
        "Any misleading representation of data, unsupported conclusions, or external assistance during restricted time may affect scoring."
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
      order: 1,
      code: "EC",
      name: "Expression Challenge",
      track: "Non-Technical",
      summary: "A silent acting and guessing stage event for coordinated two-member teams.",
      description:
        "One teammate acts out a song title, movie name, famous dialogue, personality, or topic using only body language while the other guesses within the time limit.",
      visualTitle: "Stage gestures and quick guesses",
      accent: "blue-violet",
      visualTags: ["Silent acting", "Fast guesses", "Team coordination"],
      minTeamSize: 2,
      maxTeamSize: 2,
      feeType: "per_team",
      feeAmount: 0,
      prizes: [],
      rules: [
        "Exactly 2 members per team: one actor and one guesser.",
        "Strictly no speaking, lip-syncing, mouthing words, spelling, letter gestures, or direct clues.",
        "Each round has a fixed time limit.",
        "Teams earn points for every correct answer.",
        "Winners are decided by the highest correct answers in the shortest time."
      ],
      importantNotes: [
        {
          tone: "prohibited",
          title: "No direct clues",
          description: "Actors must use only body language. Speech, lip movement, spelling, and letter hints are not allowed."
        },
        {
          tone: "required",
          title: "Two-member team",
          description: "Each team must have one actor and one guesser."
        }
      ],
      registrationOpen: false
    },
    {
      order: 2,
      code: "MQ",
      name: "Mystery Quest",
      track: "Non-Technical",
      summary: "Decode words through sketching and one-word clues across two quick rounds.",
      description:
        "Teams use creativity, communication, quick thinking, and teamwork to solve visual and verbal clue challenges under pressure.",
      visualTitle: "Clue cards and hidden answers",
      accent: "cyan-blue",
      visualTags: ["Sketch Sprint", "Clue Cascade", "Team decoding"],
      minTeamSize: 2,
      maxTeamSize: 2,
      feeType: "per_team",
      feeAmount: 0,
      prizes: [],
      rules: [
        "Each team has 2 members: one clue-giver and one guesser. Roles may switch between rounds.",
        "Round 1, Sketch Sprint: one member draws the given word while the other guesses.",
        "Sketch Sprint allows 60 seconds per word with multiple attempts.",
        "Sketch Sprint is drawing only. Speaking, letters, numbers, and symbols are not allowed.",
        "Round 2, Clue Cascade: one member gives one-word verbal clues for the secret word.",
        "Clue Cascade allows 60 seconds per team.",
        "No gestures, spelling, rhyming, direct translations, or parts of the answer are allowed.",
        "Invalid clues skip the word and score 0 points.",
        "Each correct guess earns 10 points. There is no negative marking.",
        "Combined scores determine winners. Ties use a tie-breaker round."
      ],
      importantNotes: [
        {
          tone: "warning",
          title: "Two different rounds",
          description: "Teams should be ready for both drawing-based and one-word verbal clue formats."
        },
        {
          tone: "prohibited",
          title: "No symbols or answer parts",
          description: "Letters, numbers, symbols, rhymes, translations, and answer fragments are treated as violations."
        }
      ],
      registrationOpen: false
    },
    {
      order: 3,
      code: "CC",
      name: "Connection Challenge",
      track: "Non-Technical",
      summary: "Find the common word that connects multiple images shown on screen.",
      description:
        "An individual visual puzzle challenge where participants interpret two or more images and identify the single connecting word.",
      visualTitle: "Linked image tiles and answer paths",
      accent: "violet-teal",
      visualTags: ["Visual puzzles", "Rapid Connect", "Challenge Connect"],
      minTeamSize: 1,
      maxTeamSize: 1,
      feeType: "per_participant",
      feeAmount: 0,
      prizes: [],
      rules: [
        "This is an individual event.",
        "Round 1, Rapid Connect: image-based questions are displayed to all participants.",
        "Participants must raise their hands to answer; the first raised hand gets the opportunity.",
        "Correct answers in Round 1 earn points and help qualify for Round 2.",
        "Round 2, Challenge Connect: shortlisted participants answer individually.",
        "Participants may pass if they do not know the answer.",
        "Other participants may challenge a passed question.",
        "Correct direct answers earn full points.",
        "Wrong direct answers receive -1 mark.",
        "Wrong challenger answers receive -2 marks.",
        "Correct challenger answers earn points.",
        "Electronic devices and external assistance are strictly prohibited.",
        "The highest total score determines the winner."
      ],
      importantNotes: [
        {
          tone: "info",
          title: "Individual challenge",
          description: "Participants compete solo through rapid visual connection rounds."
        },
        {
          tone: "warning",
          title: "Challenge carefully",
          description: "Wrong challenger answers carry a larger penalty than direct wrong answers."
        }
      ],
      registrationOpen: false
    },
    {
      order: 4,
      code: "VI",
      name: "Visual Insight",
      track: "Non-Technical",
      summary: "Build and present an original story from a picture under a short time limit.",
      description:
        "Participants observe a displayed image, craft a compelling short story, and present it with imagination, clarity, and connection to the picture.",
      visualTitle: "Picture frame and story line",
      accent: "teal-blue",
      visualTags: ["Picture prompt", "Storytelling", "Creative stage"],
      minTeamSize: 1,
      maxTeamSize: 2,
      feeType: "per_participant",
      feeAmount: 0,
      prizes: [],
      rules: [
        "A random image is displayed on screen for 30 seconds.",
        "Participants get 2 to 3 minutes to construct their short story.",
        "Each participant or team gets 1 to 2 minutes to present the story on stage.",
        "All teams share the same image, but each must adopt a different narrative style or genre such as Mystery, Comedy, or Drama.",
        "Stories must directly relate to the displayed image.",
        "Presentations must strictly follow the allotted time limit.",
        "Electronic devices and external help are prohibited during preparation.",
        "Scoring is based on creativity, imagination, presentation, and connection to the picture."
      ],
      importantNotes: [
        {
          tone: "required",
          title: "Stay connected to the image",
          description: "The story should clearly grow from the displayed picture, not from an unrelated idea."
        },
        {
          tone: "info",
          title: "Genre twist",
          description: "Teams may receive different narrative styles even when the image is the same."
        }
      ],
      registrationOpen: false
    }
  ]
};
