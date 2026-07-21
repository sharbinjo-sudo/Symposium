export type FeeType = "per_participant" | "per_team";
export type EventNoteTone = "info" | "warning" | "prohibited" | "required";

export type EventConfig = {
  order: number;
  code: string;
  name: string;
  track: "Technical" | "Non-Technical";
  summary: string;
  description: string;
  visualTitle: string;
  accent: "blue-violet" | "cyan-blue" | "violet-teal" | "teal-blue";
  visualTags: string[];
  minTeamSize: number;
  maxTeamSize: number;
  feeType: FeeType;
  feeAmount: number;
  prizes: string[];
  rules: string[];
  importantNotes: Array<{
    tone: EventNoteTone;
    title: string;
    description: string;
  }>;
  registrationOpen: boolean;
};

export type SiteConfig = {
  eventTitle: string;
  heroSubtitle: string;
  themeTagline: string;
  eventDate: string;
  registrationDeadline: string;
  venue: string;
  venueDetail: string;
  heroCopy: string;
  about: string;
  facilitiesNote: string;
  contacts: Array<{ label: string; value: string }>;
  highlights: string[];
  heroStats: Array<{ value: string; label: string }>;
  technicalEvents: EventConfig[];
  nonTechnicalEvents: Array<{ name: string; summary: string }>;
};

export type ParticipantInput = {
  fullName: string;
  collegeName: string;
  rollNumber: string;
  mobileNumber: string;
  email: string;
  department: string;
  yearOfStudy: string;
  isTeamLeader: boolean;
};

export type RegistrationPayload = {
  eventCode: string;
  teamName: string;
  teamSize: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  consentGiven: boolean;
  participants: ParticipantInput[];
  idempotencyKey: string;
};

export type RegistrationPaymentOrderPayload = {
  eventCode: string;
  teamName: string;
  teamSize: number;
  participants: ParticipantInput[];
  idempotencyKey: string;
};

export type RegistrationPaymentOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
};

export type RegistrationResponse = {
  registrationCode: string;
  paymentStatus: string;
  emailStatus: string;
  paymentReference: string;
  paymentDate: string;
  paymentProvider: string;
};

export type RegistrationStatusLookupPayload = {
  registrationCode: string;
  email: string;
};

export type RegistrationStatusResponse = {
  registrationCode: string;
  eventCode: string;
  eventName: string;
  teamName: string;
  teamSize: number;
  participantNames: string[];
  leadParticipantName: string;
  participantEmail: string;
  amountPaid: string;
  paymentStatus: string;
  registrationStatus: string;
  emailStatus: string;
  paymentReference: string;
  paymentProvider: string;
  paymentDate: string;
  attendanceMarked: boolean;
  submittedAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  totalRegistrations: number;
  pendingPayments: number;
  verifiedPayments: number;
  attendanceMarked: number;
  latestRegistration: null | {
    registrationCode: string;
    eventName: string;
    teamName: string;
    participantName: string;
    participantEmail: string;
    paymentStatus: string;
    createdAt: string;
  };
};

export type AdminRegistrationRow = {
  participantNames: string[];
  leadParticipantName: string;
  leadParticipantEmail: string;
  registrationCode: string;
  eventName: string;
  teamName: string;
  teamSize: number;
  transactionId: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentDate: string;
  registrationStatus: string;
  emailStatus: string;
  adminNote: string | null;
  attendanceMarked: boolean;
  screenshotAvailable: boolean;
  createdAt: string;
};

export type AdminRegistrationFilters = {
  search?: string;
  eventCode?: string;
  paymentStatus?: string;
};

export type AdminRegistrationActionPayload = {
  paymentStatus?: string;
  adminNote?: string;
  attendanceMarked?: boolean;
};

export type AdminRegistrationCreatePayload = {
  eventCode: string;
  teamName: string;
  teamSize: number;
  transactionId: string;
  paymentProvider: string;
  paymentStatus: string;
  paymentDate: string;
  adminNote?: string;
  attendanceMarked?: boolean;
  sendEmail?: boolean;
  participants: ParticipantInput[];
};
