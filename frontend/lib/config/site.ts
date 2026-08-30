import type { SiteConfig } from "@/lib/types";

export const siteConfig: SiteConfig = {
  eventTitle: "CYBERPUNK'26",
  heroSubtitle: "National Level AI & Data Science Symposium",
  themeTagline: "VV College of Engineering welcomes all engineering students to CYBERPUNK'26.",
  eventDate: process.env.NEXT_PUBLIC_EVENT_DATE ?? "2026-09-11T09:30:00+05:30",
  registrationDeadline: process.env.NEXT_PUBLIC_REGISTRATION_DEADLINE ?? "2026-09-11T00:30:00+05:30",
  venue: "V V College of Engineering",
  venueDetail: "V V Nagar, Tisaiyanvillai - 627657",
  heroCopy:
    "A national-level technical symposium featuring technical and non-technical events for individually registered participants. Registration fee: ₹250 per participant.",
  about:
    "CYBERPUNK'26 is a national-level technical symposium organized by the Department of Artificial Intelligence and Data Science, V V College of Engineering. The symposium starts at 9:30 AM on September 11, 2026, with technical and non-technical events for individually registered participants.",
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
  community: {
    whatsappGroup: "https://chat.whatsapp.com/BDgammW6Hma5zsKvd2dzBX?s=sw&p=a&mlu=4"
  },
  paymentScannerImage: process.env.NEXT_PUBLIC_PAYMENT_SCANNER_IMAGE ?? "",
  paymentReceiverName: process.env.NEXT_PUBLIC_PAYMENT_RECEIVER_NAME ?? "Suriya L",
  highlights: [
    "National-level technical symposium hosted by the Department of AI & DS",
    "Open to all engineering students",
    "Separate registration for each participant",
    "Registration fee: ₹250 per member",
    "Registration end date: September 11, 2026, 12:30 AM"
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
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "Each participant must register individually for Paper Presentation.",
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
      description: "A coding challenge for individual participants, focused on problem solving, debugging discipline, and implementation clarity.",
      visualTitle: "Logic nodes and clean code motion",
      accent: "cyan-blue",
      visualTags: ["Algorithm rounds", "Debug sprints", "Logic trails"],
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "Each participant must register individually.",
        "The event will include programming, debugging, logic-building, and problem-solving challenges.",
        "Programming languages, platform details, input-output format, and submission instructions will be shared by the coordinators on event day.",
        "Participants must complete each challenge within the announced time limit.",
        "Solutions will be evaluated based on correctness, efficiency, logic, code clarity, and successful execution.",
        "Use of phones, internet search, AI tools, external devices, or outside collaboration is strictly prohibited during the contest.",
        "Any form of malpractice, sharing answers, or copying code from another participant will lead to disqualification.",
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
          description: "Submission closes immediately at the final buzzer, even if a participant is still typing."
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
      description: "A web development event for individual participants to turn a given idea into a useful, readable, and presentable web interface.",
      visualTitle: "Layered browsers and responsive frames",
      accent: "violet-teal",
      visualTags: ["Responsive UI", "Component systems", "Interface craft"],
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "Each participant must register individually.",
        "Participants will be given a web development task, theme, or problem statement during the event.",
        "The final output should be functional, readable, responsive, and aligned with the given task.",
        "Participants may use standard frontend technologies and tools permitted by the coordinators on event day.",
        "The interface should work properly on common screen sizes and should avoid broken layouts, unreadable text, and incomplete navigation.",
        "Judging will cover UI quality, responsiveness, usability, creativity, completeness, code organization, and presentation of the final output.",
        "Participants must be ready to demonstrate the working project and explain their design and implementation decisions to the panel.",
        "Submissions made after the announced deadline may not be considered for evaluation."
      ],
      importantNotes: [
        {
          tone: "required",
          title: "Demo ready build",
          description: "Participants should be ready to show their final project running during the review window."
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
      feeAmount: 250,
      prizes: ["First Prize: Rs. 1,000", "Second Prize: Rs. 500", "Certificates: All registered participants"],
      rules: [
        "Each participant must register individually.",
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
      summary: "Express emotions and ideas using only facial expressions and body language.",
      description:
        "Participants must express a given emotion, situation, or idea using only their facial expressions and body language.",
      visualTitle: "Stage gestures and quick guesses",
      accent: "blue-violet",
      visualTags: ["Silent acting", "Fast guesses", "Stage coordination"],
      feeAmount: 0,
      prizes: [],
      rules: [
        "Each participant will receive a random word, emotion, or situation.",
        "The participant must express it without speaking.",
        "Other participants or audience must guess the given expression.",
        "A fixed time limit will be provided for each turn.",
        "Participants may use facial expressions and gestures, but no props.",
        "No words, sounds, mobile phones, or outside assistance are allowed.",
        "The given word or situation must not be directly revealed through gestures such as spelling letters.",
        "Each correct guess within the time limit earns points.",
        "The participant cannot change the assigned word once the round begins.",
        "Winners are decided by the highest correct answers in the shortest time."
      ],
      importantNotes: [
        {
          tone: "prohibited",
          title: "No speaking or props",
          description: "Participants must rely solely on facial expressions and body language. Words, sounds, and props are not allowed."
        },
        {
          tone: "required",
          title: "Stick to the word",
          description: "Once assigned, the word or emotion cannot be changed during the round."
        }
      ],
      registrationOpen: false
    },
    {
      order: 2,
      code: "SD",
      name: "Spot the Difference",
      track: "Non-Technical",
      summary: "Find as many differences as possible between two similar images within a time limit.",
      description:
        "Participants will be shown two similar images side-by-side and must identify as many differences as possible within the given time.",
      visualTitle: "Twin images and hidden differences",
      accent: "cyan-blue",
      visualTags: ["Sharp eyes", "Speed observation", "Detail spotting"],
      feeAmount: 0,
      prizes: [],
      rules: [
        "Two similar images will be displayed side-by-side.",
        "Participants must carefully observe and identify the differences.",
        "A fixed time limit will be given for each round.",
        "Participants must mention the location or description of each difference.",
        "Each correctly identified difference earns points.",
        "No mobile phones, internet, AI tools, or outside assistance are allowed.",
        "Participants cannot zoom, edit, or manipulate the images.",
        "Answers must be submitted before the timer ends.",
        "Once submitted, answers cannot be changed.",
        "Winners are decided by the highest correct answers."
      ],
      importantNotes: [
        {
          tone: "prohibited",
          title: "No devices or outside help",
          description: "Mobile phones, internet, AI tools, and outside assistance are strictly prohibited."
        },
        {
          tone: "warning",
          title: "No image manipulation",
          description: "Participants cannot zoom, edit, or manipulate the images in any way."
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
          description: "Participants compete individually through rapid visual connection rounds."
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
      code: "HAI",
      name: "Human vs AI",
      track: "Non-Technical",
      summary: "Identify whether displayed content is Human-made or AI-generated.",
      description:
        "Participants must identify whether the displayed content is human-made or AI-generated.",
      visualTitle: "Pixel blur and human hand",
      accent: "teal-blue",
      visualTags: ["Spot the source", "AI detection", "Sharp judgment"],
      feeAmount: 0,
      prizes: [],
      rules: [
        "Each round will display one image or content sample.",
        "Participants must decide: Human-made or AI-generated.",
        "Each sample will have a limited time for identification.",
        "Participants must submit their answer before the timer ends.",
        "No internet, mobile phones, AI tools, or outside assistance are allowed.",
        "Once an answer is submitted, it cannot be changed.",
        "The content may include images, posters, artwork, photographs, or creative designs.",
        "Some samples may be intentionally difficult to distinguish.",
        "Judges' decisions will be final and binding."
      ],
      importantNotes: [
        {
          tone: "prohibited",
          title: "No external help",
          description: "Internet, mobile phones, AI tools, and outside assistance are strictly prohibited."
        },
        {
          tone: "required",
          title: "Final decision",
          description: "Judges' decisions will be final and binding in all cases."
        }
      ],
      registrationOpen: false
    }
  ]
};
