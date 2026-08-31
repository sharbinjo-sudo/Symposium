export type FeeType = "per_participant";
export type EventNoteTone = "info" | "warning" | "prohibited" | "required";
export type FoodPreference = "veg" | "non_veg";

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
  paymentScannerImage: string;
  paymentReceiverName: string;
  highlights: string[];
  heroStats: Array<{ value: string; label: string }>;
  technicalEvents: EventConfig[];
  nonTechnicalEvents: EventConfig[];
};

export type ParticipantInput = {
  fullName: string;
  collegeName: string;
  mobileNumber: string;
  email: string;
  department: string;
  yearOfStudy: string;
  foodPreference: FoodPreference | "";
};

export type RegistrationPayload = {
  eventCode: string;
  eventCodes: string[];
  technicalEventCodes: string[];
  nonTechnicalEventCodes: string[];
  transactionId: string;
  paymentDate: string;
  paymentUploadToken: string;
  consentGiven: boolean;
  participants: ParticipantInput[];
  idempotencyKey: string;
};

export type RegistrationPrecheckPayload = {
  eventCode?: string;
  eventCodes?: string[];
  transactionId?: string;
  participants?: Array<Pick<ParticipantInput, "email" | "mobileNumber">>;
};

export type RegistrationResponse = {
  registrationCode: string;
  eventCode: string;
  eventName: string;
  eventCodes: string[];
  eventNames: string[];
  technicalEventCodes: string[];
  technicalEventNames: string[];
  nonTechnicalEventCodes: string[];
  nonTechnicalEventNames: string[];
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
  eventCodes: string[];
  eventNames: string[];
  technicalEventCodes: string[];
  technicalEventNames: string[];
  nonTechnicalEventCodes: string[];
  nonTechnicalEventNames: string[];
  participantNames: string[];
  participantFoodPreferences: string[];
  leadParticipantName: string;
  participantEmail: string;
  amountPaid: string;
  paymentStatus: string;
  registrationStatus: string;
  emailStatus: string;
  paymentReference: string;
  paymentProvider: string;
  paymentDate: string;
  submittedAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  totalRegistrations: number;
  pendingPayments: number;
  verifiedPayments: number;
  latestRegistration: null | {
    registrationCode: string;
    eventName: string;
    participantName: string;
    participantEmail: string;
    paymentStatus: string;
    createdAt: string;
  };
};

export type AdminRegistrationRow = {
  participantNames: string[];
  participantFoodPreferences: string[];
  leadParticipantName: string;
  leadParticipantEmail: string;
  registrationCode: string;
  eventName: string;
  eventCodes: string[];
  eventNames: string[];
  technicalEventCodes: string[];
  technicalEventNames: string[];
  nonTechnicalEventCodes: string[];
  nonTechnicalEventNames: string[];
  amountPaid: string;
  transactionId: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentDate: string;
  registrationStatus: string;
  emailStatus: string;
  adminNote: string | null;
  screenshotAvailable: boolean;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  count: number;
  limit: number;
  offset: number;
  results: T[];
};

export type AdminRegistrationFilters = {
  search?: string;
  eventCode?: string;
  paymentStatus?: string;
};

export type AdminRegistrationActionPayload = {
  paymentStatus?: string;
  adminNote?: string;
};

export type AdminRegistrationCreatePayload = {
  eventCode: string;
  eventCodes?: string[];
  transactionId: string;
  paymentProvider: string;
  paymentStatus: string;
  paymentDate: string;
  adminNote?: string;
  sendEmail?: boolean;
  participants: ParticipantInput[];
};
