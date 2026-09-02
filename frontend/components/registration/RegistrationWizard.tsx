"use client";
import { startTransition, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { StatusChip } from "@/components/ui/StatusChip";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { ApiError, createIdempotencyKey, precheckRegistration, submitRegistration, uploadScreenshot } from "@/lib/api";
import { siteConfig } from "@/lib/config/site";
import { formatFoodPreference } from "@/lib/format";
import { assignWithLoading } from "@/lib/navigation-transition";
import { createRegistrationSchema, participantSchema } from "@/lib/validation/registration";
import type { EventConfig, ParticipantInput, RegistrationResponse } from "@/lib/types";

const exclusiveEventPairs = [["WC", "VS"]];
const eventConflictMessage =
  "Choose either Web Craft or Visualytics, not both, due to the event schedule. Check Timeline page for more details.";

const paymentQrCards: Record<number, string> = {
  250: "/suriya_qr_250_scan.png"
};

const upiPayeeId = "suriyalingadurai1996-1@okhdfcbank";
const upiPayeeName = "Suriya L";

function createUpiPaymentUrl(totalAmount: number) {
  const params = new URLSearchParams({
    pa: upiPayeeId,
    pn: upiPayeeName,
    am: String(totalAmount),
    cu: "INR"
  });

  return `upi://pay?${params.toString()}`;
}

function getReadableUiError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const message = error.message.trim();

  if (!message || message === "Failed to fetch" || /network/i.test(message)) {
    return "Unable to connect right now. Please check your internet connection and try again.";
  }

  return message;
}

function emptyParticipant(): ParticipantInput {
  return {
    fullName: "",
    collegeName: "",
    mobileNumber: "",
    email: "",
    department: "",
    yearOfStudy: "",
    foodPreference: ""
  };
}

function normalizeSelectedEventCodes(events: EventConfig[], codes: string[]) {
  const availableCodes = new Set(events.map((event) => event.code));
  return codes
    .map((code) => code.trim().toUpperCase())
    .filter((code, index, allCodes) => availableCodes.has(code) && allCodes.indexOf(code) === index);
}

function hasExclusiveEventConflict(codes: string[]) {
  return exclusiveEventPairs.some(([firstCode, secondCode]) => codes.includes(firstCode) && codes.includes(secondCode));
}

function clearFieldError(errors: Record<string, string>, field: string) {
  if (!errors[field]) {
    return errors;
  }

  const next = { ...errors };
  delete next[field];
  return next;
}

function getPaymentQrCard(totalAmount: number) {
  return paymentQrCards[totalAmount] ?? siteConfig.paymentScannerImage;
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "Scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatStatusLabel(value: string | undefined) {
  return (value ?? "pending_verification")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatYearOfStudy(value: string) {
  const yearLabels: Record<string, string> = {
    "1": "1st year",
    "2": "2nd year",
    "3": "3rd year",
    "4": "4th year"
  };

  return yearLabels[value] ?? (value || "Not provided");
}

type RegistrationWizardProps = {
  events?: EventConfig[];
  initialEventCode?: string;
};

function getInitialEvent(events: EventConfig[], initialEventCode?: string) {
  const normalizedCode = initialEventCode?.trim().toUpperCase();
  if (!normalizedCode) return null;
  return events.find((event) => event.code.toUpperCase() === normalizedCode) ?? null;
}

export function RegistrationWizard({ events = siteConfig.technicalEvents, initialEventCode }: RegistrationWizardProps) {
  const availableEvents = events.length > 0 ? events : siteConfig.technicalEvents;
  const initialEvent = getInitialEvent(availableEvents, initialEventCode);
  const [eventCodes, setEventCodes] = useState<string[]>(() =>
    initialEvent ? [initialEvent.code] : []
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const paymentReferenceRef = useRef("");
  const paymentDateRef = useRef(new Date().toISOString().slice(0, 10));
  const [paymentFieldResetKey, setPaymentFieldResetKey] = useState(0);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentUploadToken, setPaymentUploadToken] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInput[]>(() =>
    [emptyParticipant()]
  );
  const participantsRef = useRef<ParticipantInput[]>(participants);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<RegistrationResponse | null>(null);
  const [acknowledgementOpen, setAcknowledgementOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [notesAccepted, setNotesAccepted] = useState(false);
  const [idempotencyKey] = useState(() => createIdempotencyKey());

  const selectedEvents = eventCodes
    .map((code) => availableEvents.find((item) => item.code === code))
    .filter((event): event is EventConfig => Boolean(event));
  const technicalRegistrationEvents = availableEvents.filter((event) => event.track === "Technical");
  const nonTechnicalRegistrationEvents = availableEvents.filter((event) => event.track === "Non-Technical");
  const eventSelectionGroups = [
    { title: "Technical Events", events: technicalRegistrationEvents },
    { title: "Non-Technical Events", events: nonTechnicalRegistrationEvents }
  ].filter((group) => group.events.length > 0);
  const currentEvent = selectedEvents[0] ?? availableEvents[0];
  const eventCode = currentEvent?.code ?? "";

  const totalAmount = currentEvent ? currentEvent.feeAmount : 250;
  const paymentQrCard = getPaymentQrCard(totalAmount);
  const upiPaymentUrl = createUpiPaymentUrl(totalAmount);
  const paymentQrLabel = "Payment QR";
  const registrationFeeLabel = `₹${currentEvent?.feeAmount ?? 250} per participant`;
  const soloParticipants = participants.slice(0, 1);
  const leadParticipant = soloParticipants[0] ?? emptyParticipant();
  const coordinatorEmail = siteConfig.contacts.find((contact) => contact.label === "Mail ID")?.value ?? "Organizer email";
  const paymentLocked = Boolean(paymentUploadToken);
  const paymentLockedMessage =
    "Payment proof is already uploaded. Submit this registration, or remove the proof if you need to change details.";

  useEffect(() => {
    const isAcknowledgementVisible = Boolean(confirmation && acknowledgementOpen);
    document.body.classList.toggle("is-printing-acknowledgement", isAcknowledgementVisible);

    return () => {
      document.body.classList.remove("is-printing-acknowledgement");
    };
  }, [acknowledgementOpen, confirmation]);

  useEffect(() => {
    setIsAndroidDevice(/Android/i.test(navigator.userAgent));
  }, []);

  function handleDownloadPdf() {
    setAcknowledgementOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  }

  function syncParticipants() {
    const nextParticipants = [participantsRef.current[0] ?? emptyParticipant()];
    participantsRef.current = nextParticipants;
    setParticipants(nextParticipants);
  }

  function getSoloParticipantsSnapshot() {
    return (participantsRef.current.length > 0 ? participantsRef.current : participants).slice(0, 1);
  }

  function commitParticipantChanges() {
    const nextParticipants = getSoloParticipantsSnapshot().map((participant) => ({ ...participant }));
    participantsRef.current = nextParticipants;
    setParticipants(nextParticipants);
    return nextParticipants;
  }

  function resetPaymentState() {
    const nextPaymentDate = new Date().toISOString().slice(0, 10);
    paymentReferenceRef.current = "";
    paymentDateRef.current = nextPaymentDate;
    setPaymentReference("");
    setPaymentDate(nextPaymentDate);
    setPaymentFieldResetKey((current) => current + 1);
    setPaymentScreenshot(null);
    setPaymentUploadToken("");
    setPaymentMessage("");
    setSubmitError("");
    setErrors((current) => {
      const next = { ...current };
      delete next.payment;
      delete next.transactionId;
      delete next.paymentDate;
      delete next.paymentUploadToken;
      return next;
    });
  }

  function commitPaymentFields() {
    const nextPaymentReference = paymentReferenceRef.current.trim();
    const nextPaymentDate = paymentDateRef.current;
    setPaymentReference(nextPaymentReference);
    setPaymentDate(nextPaymentDate);
    return {
      paymentReference: nextPaymentReference,
      paymentDate: nextPaymentDate
    };
  }

  function updateSelectedEvents(nextCodes: string[]) {
    if (paymentLocked) {
      setSubmitError(paymentLockedMessage);
      return;
    }

    const normalizedCodes = normalizeSelectedEventCodes(availableEvents, nextCodes);

    if (hasExclusiveEventConflict(normalizedCodes)) {
      setErrors((current) => ({
        ...current,
        eventCodes: eventConflictMessage
      }));
      return;
    }

    setEventCodes(normalizedCodes);
    syncParticipants();
    resetPaymentState();
    setErrors((current) => {
      const next = { ...current };
      delete next.eventCode;
      delete next.eventCodes;

      return next;
    });
  }

  function handleEventToggle(nextEventCode: string) {
    const nextCodes = eventCodes.includes(nextEventCode)
      ? eventCodes.filter((code) => code !== nextEventCode)
      : [...eventCodes, nextEventCode];
    updateSelectedEvents(nextCodes);
  }

  function handleParticipantChange(index: number, field: keyof ParticipantInput, value: string | boolean) {
    if (paymentLocked) {
      setSubmitError(paymentLockedMessage);
      return;
    }
    participantsRef.current = getSoloParticipantsSnapshot().map((participant, participantIndex) =>
      participantIndex === index ? { ...participant, [field]: value } : participant
    );
    setSubmitError("");
    setErrors((current) => clearFieldError(current, `participant-${index}-${field}`));
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    const currentSoloParticipants = getSoloParticipantsSnapshot();
    const currentPaymentReference = paymentReferenceRef.current.trim();
    const currentPaymentDate = paymentDateRef.current;

    if (eventCodes.length === 0) {
      nextErrors.eventCodes = "Choose at least one event to continue.";
    } else if (hasExclusiveEventConflict(eventCodes)) {
      nextErrors.eventCodes = eventConflictMessage;
    }

    currentSoloParticipants.forEach((participant, index) => {
      const result = participantSchema.safeParse(participant);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const fieldName = issue.path[0];
          if (typeof fieldName === "string") {
            nextErrors[`participant-${index}-${fieldName}`] = issue.message;
          }
        });
      }

      const trimmedYear = participant.yearOfStudy.trim();
      if (!trimmedYear) {
        nextErrors[`participant-${index}-yearOfStudy`] = "Year of study is required.";
      }

      if (!participant.foodPreference) {
        nextErrors[`participant-${index}-foodPreference`] = "Choose Veg or Non-Veg food preference.";
      }

      const trimmedCollege = participant.collegeName.trim();
      if (!trimmedCollege) {
        nextErrors[`participant-${index}-collegeName`] = "College name is required.";
      }

      const trimmedDepartment = participant.department.trim();
      if (!trimmedDepartment) {
        nextErrors[`participant-${index}-department`] = "Department is required.";
      }

      const trimmedEmail = participant.email.trim();
      if (!trimmedEmail) {
        nextErrors[`participant-${index}-email`] = "Email address is required.";
      }

      const trimmedMobile = participant.mobileNumber.trim();
      if (!trimmedMobile) {
        nextErrors[`participant-${index}-mobileNumber`] = "Mobile number is required.";
      }

      const trimmedName = participant.fullName.trim();
      if (!trimmedName) {
        nextErrors[`participant-${index}-fullName`] = "Full name is required.";
      }
    });

    if (!currentPaymentReference) {
      nextErrors.transactionId = "UPI transaction ID is required.";
    } else if (!/^\d{12}$/.test(currentPaymentReference)) {
      nextErrors.transactionId = "Enter the 12-digit UPI transaction ID.";
    }
    if (!currentPaymentDate) {
      nextErrors.paymentDate = "Payment date is required.";
    }
    if (!paymentUploadToken) {
      nextErrors.paymentUploadToken = "Upload the payment screenshot to continue.";
    }
    if (!notesAccepted) {
      nextErrors.notesAccepted = "Please read and accept the registration notes to continue.";
    }
    if (!consentGiven) {
      nextErrors.consentGiven = "Please confirm the privacy note to continue.";
    }

    const schema = createRegistrationSchema();
    const result = schema.safeParse({
      eventCode,
      eventCodes,
      transactionId: currentPaymentReference,
      paymentDate: currentPaymentDate,
      paymentUploadToken,
      consentGiven,
      participants: currentSoloParticipants
    });

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        nextErrors[issue.path.join(".") || "form"] = issue.message;
      });
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function runDuplicatePrecheck() {
    const currentSoloParticipants = getSoloParticipantsSnapshot();
    const currentPaymentReference = paymentReferenceRef.current.trim();

    try {
      await precheckRegistration({
        eventCode,
        eventCodes,
        transactionId: currentPaymentReference,
        participants: currentSoloParticipants.map((participant) => ({
          email: participant.email,
          mobileNumber: participant.mobileNumber
        }))
      });

      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors((current) => ({ ...current, ...error.fieldErrors }));
        setSubmitError(getReadableUiError(error, "Please fix the duplicate details before continuing."));
      } else {
        setSubmitError(getReadableUiError(error, "We couldn't check duplicate details right now. Please try again."));
      }

      return false;
    }
  }

  async function handlePaymentScreenshotChange(file: File | null) {
    setPaymentScreenshot(file);
    setPaymentUploadToken("");
    setPaymentMessage("");
    setSubmitError("");
    setErrors((current) => {
      const next = { ...current };
      delete next.payment;
      delete next.paymentUploadToken;
      return next;
    });

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        paymentUploadToken: "The selected file is too large. Please choose a file under 5 MB."
      }));
      return;
    }

    setUploadingScreenshot(true);
    try {
      const uploadToken = await uploadScreenshot(file);
      setPaymentUploadToken(uploadToken);
      setPaymentMessage("Payment screenshot uploaded. The organizers will verify it manually.");
      setErrors((current) => {
        const next = { ...current };
        delete next.payment;
        delete next.paymentUploadToken;
        return next;
      });
    } catch (error) {
      setPaymentScreenshot(null);
      setSubmitError(getReadableUiError(error, "We couldn't upload that screenshot. Please try again."));
    } finally {
      setUploadingScreenshot(false);
    }
  }

  function handleSubmit() {
    const currentSoloParticipants = commitParticipantChanges();
    const currentPayment = commitPaymentFields();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    startTransition(() => {
      void (async () => {
        try {
          if (!paymentUploadToken) {
            throw new Error("Upload the payment screenshot before submitting.");
          }

          setCheckingDuplicates(true);
          try {
            if (!(await runDuplicatePrecheck())) {
              return;
            }
          } finally {
            setCheckingDuplicates(false);
          }

          const technicalCodes = eventCodes.filter((code) => {
            const event = availableEvents.find((e) => e.code === code);
            return event?.track === "Technical";
          });
          const nonTechnicalCodes = eventCodes.filter((code) => {
            const event = availableEvents.find((e) => e.code === code);
            return event?.track === "Non-Technical";
          });

          const response = await submitRegistration({
            eventCode,
            eventCodes,
            technicalEventCodes: technicalCodes,
            nonTechnicalEventCodes: nonTechnicalCodes,
            transactionId: currentPayment.paymentReference,
            paymentDate: currentPayment.paymentDate,
            paymentUploadToken,
            consentGiven,
            participants: currentSoloParticipants.map((participant) => ({ ...participant })),
            idempotencyKey
          });
          setConfirmation(response);
          setAcknowledgementOpen(true);
        } catch (error) {
          if (error instanceof ApiError) {
            setErrors((current) => ({ ...current, ...error.fieldErrors }));
            setSubmitError(getReadableUiError(error, "We couldn't submit your registration right now. Please try again."));
          } else {
            setSubmitError(getReadableUiError(error, "We couldn't submit your registration right now. Please try again."));
          }
        } finally {
          setSubmitting(false);
        }
      })();
    });
  }

  return (
    <div className="wizard-shell">
      <AnimatePresence>
        {confirmation && acknowledgementOpen ? (
          <motion.div
            className="acknowledgement-modal-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setAcknowledgementOpen(false)}
          >
            <motion.section
              className="acknowledgement-modal acknowledgement-pdf-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="acknowledgement-modal-title"
              initial={{ opacity: 0, y: 34, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.98 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="acknowledgement-modal-close"
                aria-label="Close acknowledgement"
                onClick={() => setAcknowledgementOpen(false)}
              >
                x
              </button>

              <article className="ack-document" aria-label={`${siteConfig.eventTitle} registration acknowledgement`}>
                <div className="ack-document-border">
                  <header className="ack-document-letterhead">
                    <span className="ack-college-seal">
                      <img src="/vvcoe-logo.jpg" alt="V V College of Engineering logo" />
                    </span>

                    <div className="ack-college-title">
                      <strong>V V College of Engineering</strong>
                      <span>Department of Artificial Intelligence and Data Science</span>
                      <span>V V Nagar, Arasoor, Tisaiyanvilai (Via), Sathankulam Taluk, Tuticorin District, Tamil Nadu - 628656</span>
                    </div>

                    <div className="ack-document-meta">
                      <span>Generated on</span>
                      <strong>{formatDisplayDate(confirmation.paymentDate || new Date().toISOString())}</strong>
                      <span>Official acknowledgement</span>
                    </div>
                  </header>

                  <div className="ack-document-body">
                    <section className="ack-document-title">
                      <span className="section-eyebrow">CYBERPUNK&apos;26</span>
                      <h2 id="acknowledgement-modal-title">Registration Acknowledgement</h2>
                      <p>
                        This document confirms that the participant details and payment reference have been received
                        for CYBERPUNK&apos;26, a national-level technical symposium.
                      </p>
                    </section>

                    <section className="ack-code-band">
                      <div>
                        <span>Registration code</span>
                        <strong>{confirmation.registrationCode}</strong>
                      </div>
                      <div className="ack-status-stamp">Payment {formatStatusLabel(confirmation.paymentStatus)}</div>
                    </section>

                    <section className="ack-detail-grid" aria-label="Registration summary">
                      <div>
                        <span>Technical events</span>
                        <strong>{selectedEvents.filter((e) => e.track === "Technical").map((e) => e.name).join(", ") || "None"}</strong>
                      </div>
                      <div>
                        <span>Non-technical events</span>
                        <strong>{selectedEvents.filter((e) => e.track === "Non-Technical").map((e) => e.name).join(", ") || "None"}</strong>
                      </div>
                      <div>
                        <span>Registration type</span>
                        <strong>Individual registration</strong>
                      </div>
                      <div>
                        <span>Amount paid</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div>
                        <span>Event date</span>
                        <strong>{formatDisplayDate(siteConfig.eventDate)}</strong>
                      </div>
                      <div>
                        <span>Event time</span>
                        <strong>9:30 AM onwards</strong>
                      </div>
                      <div>
                        <span>Venue</span>
                        <strong>{siteConfig.venueDetail}</strong>
                      </div>
                    </section>

                    <section className="ack-section">
                      <div className="ack-section-head">
                        <span>Participant details</span>
                      </div>

                      <table className="ack-table">
                        <tbody>
                          <tr>
                            <th>Full name</th>
                            <td>{leadParticipant.fullName || "Participant"}</td>
                          </tr>
                          <tr>
                            <th>Email address</th>
                            <td>{leadParticipant.email || "Email not provided"}</td>
                          </tr>
                          <tr>
                            <th>Mobile number</th>
                            <td>{leadParticipant.mobileNumber || "Phone not provided"}</td>
                          </tr>
                          <tr>
                            <th>College</th>
                            <td>{leadParticipant.collegeName || "College not provided"}</td>
                          </tr>
                          <tr>
                            <th>Department</th>
                            <td>{leadParticipant.department || "Department not provided"}</td>
                          </tr>
                          <tr>
                            <th>Year</th>
                            <td>{formatYearOfStudy(leadParticipant.yearOfStudy)}</td>
                          </tr>
                          <tr>
                            <th>Food preference</th>
                            <td>{formatFoodPreference(leadParticipant.foodPreference)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </section>

                    <section className="ack-section">
                      <div className="ack-section-head">
                        <span>Payment details</span>
                      </div>

                      <table className="ack-table">
                        <tbody>
                          <tr>
                            <th>Payment gateway</th>
                            <td>{formatStatusLabel(confirmation.paymentProvider)}</td>
                          </tr>
                          <tr>
                            <th>Payment reference</th>
                            <td>{confirmation.paymentReference || "Pending"}</td>
                          </tr>
                          <tr>
                            <th>Payment status</th>
                            <td>{formatStatusLabel(confirmation.paymentStatus)}</td>
                          </tr>
                          <tr>
                            <th>Email status</th>
                            <td>{formatStatusLabel(confirmation.emailStatus)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </section>

                    <div className="ack-note-box">
                      Please keep this acknowledgement safe. The registration code and participant email may be
                      required for event-day verification, status lookup, and organizer communication. All registered
                      participants are eligible to receive participation certificates.
                    </div>

                    <footer className="ack-footer">
                      <p>
                        For help, contact {coordinatorEmail}. This acknowledgement is generated from the registration
                        system and should be presented when requested by the organizing committee.
                      </p>
                      <div className="ack-signature">
                        <span />
                        <strong>Organizing Committee</strong>
                        <small>CYBERPUNK&apos;26</small>
                      </div>
                    </footer>
                  </div>
                </div>
              </article>

              <div className="acknowledgement-modal-actions ack-document-actions">
                <p>Click Download PDF, then choose Save as PDF in the browser print window.</p>
                <Button type="button" variant="primary" onClick={handleDownloadPdf}>
                  Download PDF
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAcknowledgementOpen(false)}>
                  View full acknowledgement
                </Button>
                <Button type="button" variant="secondary" onClick={() => assignWithLoading("/status")}>
                  Check status
                </Button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="container">
        <div className="wizard-heading-wrap">
          <AnimatedHeading
            eyebrow="Registration"
            title="Complete your symposium registration"
            copy="Choose your events, enter participant details, upload payment proof, and submit everything from one page."
          />
        </div>

        <GlassPanel className="wizard-card wizard-main-card" tone="strong">
          {confirmation ? (
            <section className="wizard-stage wizard-confirm-stage">
              <div className="confirmation-panel">
                <SuccessAnimation registrationCode={confirmation.registrationCode} />
                <h3>Registration submitted!</h3>
                <p>
                  Your registration code is <strong>{confirmation.registrationCode}</strong>.
                </p>
                <p>
                  Payment status: <strong>{formatStatusLabel(confirmation.paymentStatus)}</strong>. The confirmation
                  email will be sent after organizer verification.
                </p>
                <div className="confirmation-actions">
                  <Button type="button" variant="primary" onClick={handleDownloadPdf}>
                    Download PDF
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => assignWithLoading("/status")}>
                    Check status
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <div className="single-registration-form">
              <section className="wizard-stage wizard-participants-stage">
                <div className="wizard-stage-heading">
                  <h3>Personal details</h3>
                </div>
                <div className={`participants-grid${participants.length === 1 ? " is-single" : ""}`}>
                  {soloParticipants.map((participant, index) => (
                    <GlassPanel key={index} className="participant-card" tone="soft">
                      <div className="form-grid two">
                        <div className="field">
                          <label htmlFor={`fullName-${index}`}>Full name</label>
                          <input
                            id={`fullName-${index}`}
                            placeholder="Example: S. Kavin"
                            defaultValue={participant.fullName}
                            onChange={(event) => handleParticipantChange(index, "fullName", event.target.value)}
                            onBlur={commitParticipantChanges}
                          />
                          {errors[`participant-${index}-fullName`] ? (
                            <div className="error">{errors[`participant-${index}-fullName`]}</div>
                          ) : null}
                        </div>
                        <div className="field">
                          <label htmlFor={`college-${index}`}>College name</label>
                          <input
                            id={`college-${index}`}
                            placeholder="Example: V V College of Engineering"
                            defaultValue={participant.collegeName}
                            onChange={(event) => handleParticipantChange(index, "collegeName", event.target.value)}
                            onBlur={commitParticipantChanges}
                          />
                          {errors[`participant-${index}-collegeName`] ? (
                            <div className="error">{errors[`participant-${index}-collegeName`]}</div>
                          ) : null}
                        </div>
                        <div className="field">
                          <label htmlFor={`mobile-${index}`}>Mobile number</label>
                          <input
                            id={`mobile-${index}`}
                            inputMode="tel"
                            placeholder="Example: +91 98XXX XX210"
                            defaultValue={participant.mobileNumber}
                            onChange={(event) => handleParticipantChange(index, "mobileNumber", event.target.value)}
                            onBlur={commitParticipantChanges}
                          />
                          {errors[`participant-${index}-mobileNumber`] ? (
                            <div className="error">{errors[`participant-${index}-mobileNumber`]}</div>
                          ) : null}
                        </div>
                        <div className="field">
                          <label htmlFor={`email-${index}`}>Email address</label>
                          <input
                            id={`email-${index}`}
                            type="email"
                            placeholder="participant@example.com"
                            defaultValue={participant.email}
                            onChange={(event) => handleParticipantChange(index, "email", event.target.value)}
                            onBlur={commitParticipantChanges}
                          />
                          {errors[`participant-${index}-email`] ? (
                            <div className="error">{errors[`participant-${index}-email`]}</div>
                          ) : null}
                        </div>
                        <div className="field">
                          <label htmlFor={`department-${index}`}>Department</label>
                          <input
                            id={`department-${index}`}
                            placeholder="Example: AI & DS"
                            defaultValue={participant.department}
                            onChange={(event) => handleParticipantChange(index, "department", event.target.value)}
                            onBlur={commitParticipantChanges}
                          />
                          {errors[`participant-${index}-department`] ? (
                            <div className="error">{errors[`participant-${index}-department`]}</div>
                          ) : null}
                        </div>
                        <div className="field">
                          <label htmlFor={`year-${index}`}>Year of study</label>
                          <select
                            id={`year-${index}`}
                            defaultValue={participant.yearOfStudy}
                            onChange={(event) => handleParticipantChange(index, "yearOfStudy", event.target.value)}
                            onBlur={commitParticipantChanges}
                          >
                            <option value="">Choose year</option>
                            <option value="1">1st year</option>
                            <option value="2">2nd year</option>
                            <option value="3">3rd year</option>
                            <option value="4">4th year</option>
                          </select>
                          {errors[`participant-${index}-yearOfStudy`] ? (
                            <div className="error">{errors[`participant-${index}-yearOfStudy`]}</div>
                          ) : null}
                        </div>
                        <div className="field">
                          <label htmlFor={`food-${index}`}>Food preference</label>
                          <select
                            id={`food-${index}`}
                            defaultValue={participant.foodPreference}
                            onChange={(event) => handleParticipantChange(index, "foodPreference", event.target.value)}
                            onBlur={commitParticipantChanges}
                          >
                            <option value="">Choose food</option>
                            <option value="veg">Veg</option>
                            <option value="non_veg">Non-Veg</option>
                          </select>
                          {errors[`participant-${index}-foodPreference`] ? (
                            <div className="error">{errors[`participant-${index}-foodPreference`]}</div>
                          ) : null}
                        </div>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              </section>

              <section className="wizard-stage wizard-event-stage">
                <div className="wizard-stage-heading">
                  <h3>Event selection</h3>
                </div>

                <GlassPanel className="registration-event-note" tone="soft">
                  <p className="helper">
                    <span>Note:</span>
                    <strong>{eventConflictMessage}</strong>
                  </p>
                </GlassPanel>

                {errors.eventCodes ? <div className="error registration-event-error">{errors.eventCodes}</div> : null}

                <div className="event-selector-groups">
                  {eventSelectionGroups.map((group) => (
                    <div key={group.title} className="event-selector-group">
                      <h4 className="event-selector-group-title">{group.title}</h4>
                      <div className="event-selector-grid">
                        {group.events.map((event) => (
                          <label
                            key={event.code}
                            className={`event-select-card registration-multi-event-card${
                              eventCodes.includes(event.code) ? " is-selected" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="registration-event-native-checkbox"
                              checked={eventCodes.includes(event.code)}
                              onChange={() => handleEventToggle(event.code)}
                            />
                            <span className="registration-event-checkbox" aria-hidden="true" />
                            <strong>{event.name}</strong>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <GlassPanel className="summary-panel wizard-intro-summary" tone="soft">
                  <div className="summary-row">
                    <span>Selected Technical Events</span>
                    <strong>
                      {selectedEvents.filter((e) => e.track === "Technical").map((e) => e.name).join(", ") || "None selected"}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Selected Non-Technical Events</span>
                    <strong>
                      {selectedEvents.filter((e) => e.track === "Non-Technical").map((e) => e.name).join(", ") || "None selected"}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Registration fee</span>
                    <strong>{registrationFeeLabel}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total payable</span>
                    <strong>Rs. {totalAmount}</strong>
                  </div>
                </GlassPanel>
              </section>

              <section className="wizard-stage wizard-payment-stage">
                <div className="wizard-stage-heading">
                  <h3>Payment proof</h3>
                </div>
                <div className="payment-stage">
                  <GlassPanel className="payment-qr-card" tone="soft">
                    <div className="payment-card-head">
                      <span className="section-eyebrow">Scan & Pay</span>
                      <h3>Pay Rs. {totalAmount}</h3>
                    </div>

                    {paymentQrCard ? (
                      <div className="payment-scanner-frame">
                        <img src={paymentQrCard} alt={`${paymentQrLabel} for Rs. ${totalAmount}`} />
                      </div>
                    ) : (
                      <div className="qr-placeholder" aria-label="Default payment scanner placeholder">
                        <span className="qr-grid-mark" />
                        <span className="qr-grid-mark" />
                        <span className="qr-grid-mark" />
                        <strong>Payment Scanner</strong>
                        <small>Scan, pay the exact amount, and upload the proof.</small>
                      </div>
                    )}

                    {isAndroidDevice ? (
                      <a className="upi-pay-button" href={upiPaymentUrl} aria-label={`Pay Rs. ${totalAmount} using a UPI app`}>
                        <span className="upi-pay-icon" aria-hidden="true">
                          UPI
                        </span>
                        <span>Pay with UPI app</span>
                      </a>
                    ) : null}

                    <div className="summary-row">
                      <span>Payee</span>
                      <strong>{siteConfig.paymentReceiverName}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Verification</span>
                      <strong>Manual admin check</strong>
                    </div>
                  </GlassPanel>

                  <GlassPanel className="payment-info-panel" tone="soft">
                    <div className="summary-row">
                      <span>Payment method</span>
                      <strong>Scan the code and upload proof</strong>
                    </div>

                    <div className="form-grid two">
                      <div className="field">
                        <label htmlFor="paymentReference">UPI transaction ID</label>
                        <input
                          key={`payment-reference-${paymentFieldResetKey}`}
                          id="paymentReference"
                          defaultValue={paymentReference}
                          onChange={(event) => {
                            const nextValue = event.target.value.replace(/\D/g, "").slice(0, 12);
                            if (nextValue !== event.target.value) {
                              event.target.value = nextValue;
                            }
                            paymentReferenceRef.current = nextValue;
                            setErrors((current) => clearFieldError(current, "transactionId"));
                          }}
                          onBlur={commitPaymentFields}
                          placeholder="Enter 12-digit ID"
                          inputMode="numeric"
                          pattern="\d{12}"
                          autoComplete="off"
                          maxLength={12}
                        />
                        {errors.transactionId ? <div className="error">{errors.transactionId}</div> : null}
                      </div>

                      <div className="field">
                        <label htmlFor="paymentDate">Payment date</label>
                        <input
                          key={`payment-date-${paymentFieldResetKey}`}
                          id="paymentDate"
                          type="date"
                          defaultValue={paymentDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(event) => {
                            paymentDateRef.current = event.target.value;
                            setErrors((current) => clearFieldError(current, "paymentDate"));
                          }}
                          onBlur={commitPaymentFields}
                        />
                        {errors.paymentDate ? <div className="error">{errors.paymentDate}</div> : null}
                      </div>
                    </div>

                    <UploadDropzone
                      file={paymentScreenshot}
                      onFileChange={(file) => void handlePaymentScreenshotChange(file)}
                      error={errors.paymentUploadToken}
                    />

                    <label className="consent-row">
                      <input
                        type="checkbox"
                          checked={consentGiven}
                          onChange={(event) => {
                            setConsentGiven(event.target.checked);
                            setErrors((current) => clearFieldError(current, "consentGiven"));
                          }}
                      />
                      <span>
                        I confirm my details are correct and I consent to manual verification of my registration.
                      </span>
                    </label>
                    {errors.consentGiven ? <div className="error">{errors.consentGiven}</div> : null}

                    {uploadingScreenshot ? <div className="helper">Uploading payment screenshot...</div> : null}
                    {paymentUploadToken ? (
                      <div className="payment-success-area">
                        <p className="payment-success-text">Payment proof uploaded successfully.</p>
                        <p className="helper">Submit the registration so the organizers can verify it.</p>
                      </div>
                    ) : null}
                  </GlassPanel>
                </div>

                {errors.payment ? <div className="error">{errors.payment}</div> : null}
                {paymentMessage ? <div className="helper">{paymentMessage}</div> : null}
              </section>

              <section className="wizard-stage wizard-review-stage">
                <div className="wizard-stage-heading">
                  <h3>Review &amp; Confirm</h3>
                  <p className="helper">Verify your registration details before submitting. Once submitted, changes require contacting the organizer.</p>
                </div>

                <GlassPanel className="review-unified-card" tone="soft">
                  {/* Participant Details */}
                  <div className="review-section">
                    <div className="review-card-header">
                      <span className="section-eyebrow">Participant Details</span>
                    </div>
                    <div className="review-detail-grid review-detail-grid-3">
                      <div className="review-detail-item">
                        <span>Full Name</span>
                        <strong>{leadParticipant.fullName || "Not provided"}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Email Address</span>
                        <strong>{leadParticipant.email || "Not provided"}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Mobile Number</span>
                        <strong>{leadParticipant.mobileNumber || "Not provided"}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>College</span>
                        <strong>{leadParticipant.collegeName || "Not provided"}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Department</span>
                        <strong>{leadParticipant.department || "Not provided"}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Year of Study</span>
                        <strong>{formatYearOfStudy(leadParticipant.yearOfStudy)}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Food Preference</span>
                        <strong>{formatFoodPreference(leadParticipant.foodPreference)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="review-divider" />

                  {/* Registration Summary */}
                  <div className="review-section">
                    <div className="review-card-header">
                      <span className="section-eyebrow">Registration Summary</span>
                    </div>
                    <div className="review-detail-grid review-detail-grid-3">
                      <div className="review-detail-item">
                        <span>Registration Type</span>
                        <strong>Individual Entry</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Technical Events</span>
                        <strong>
                          {selectedEvents.filter((e) => e.track === "Technical").map((e) => e.name).join(", ") || "None selected"}
                        </strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Non-Technical Events</span>
                        <strong>
                          {selectedEvents.filter((e) => e.track === "Non-Technical").map((e) => e.name).join(", ") || "None selected"}
                        </strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Fee Per Participant</span>
                        <strong>{registrationFeeLabel}</strong>
                      </div>
                      <div className="review-detail-item review-detail-highlight">
                        <span>Total Payable</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="review-divider" />

                  {/* Payment Details */}
                  <div className="review-section">
                    <div className="review-card-header">
                      <span className="section-eyebrow">Payment Details</span>
                    </div>
                    <div className="review-detail-grid review-detail-grid-2">
                      <div className="review-detail-item">
                        <span>Transaction ID</span>
                        <strong className="review-break-all">{paymentReference || "Not entered"}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Payment Date</span>
                        <strong>{formatDisplayDate(paymentDate)}</strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Payment Status</span>
                        <strong>
                          <StatusChip tone={paymentUploadToken ? "verified" : "pending"}>
                            {paymentUploadToken ? "Proof Uploaded" : "Pending Upload"}
                          </StatusChip>
                        </strong>
                      </div>
                      <div className="review-detail-item">
                        <span>Verification</span>
                        <strong>
                          <StatusChip tone="pending">Pending Organizer Review</StatusChip>
                        </strong>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </section>

              <section className="wizard-stage wizard-notes-stage">
                <div className="wizard-stage-heading">
                  <h3>Important Registration Notes</h3>
                  <p className="helper">Please review these points before completing your symposium registration.</p>
                </div>
                <GlassPanel className="registration-notes-card" tone="soft">
                  <ul className="registration-notes-list">
                    <li>The countdown shows the deadline for online registration. On-site registration will remain available on campus.</li>
                    <li>To attend the symposium, registration for at least one primary technical event is mandatory.</li>
                    <li>If time permits during the event, participants may also attend other registered technical events and non-technical events.</li>
                    <li>Non-technical events can also be selected during online registration.</li>
                    <li>Participants may choose either Web Craft or Visualytics, but not both, due to the event schedule.</li>
                    <li>Paper Presentation participants may leave the hall after completing their presentation so they can attend other events. Late arrival to Paper Presentation may be permitted when it is due to participation in another scheduled event.</li>
                    <li>If your payment is rejected, you will receive an email notification. You may register again using the same details, with corrected payment proof and a valid UPI transaction ID.</li>
                    <li>Prizes for non-technical events will be announced on campus.</li>
                    <li>After registration, participants can check their registration status on the Status page.</li>
                    <li>Each participant must complete a separate registration. If grouping is required for an event, it will be coordinated on campus.</li>
                  </ul>
                </GlassPanel>
                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={notesAccepted}
                    onChange={(event) => {
                      setNotesAccepted(event.target.checked);
                    }}
                  />
                  <span>
                    I have read and understood all the registration notes above.
                  </span>
                </label>
                {errors.notesAccepted ? <div className="error">{errors.notesAccepted}</div> : null}
              </section>

              {submitError ? <div className="error">{submitError}</div> : null}
              {!submitError && Object.keys(errors).length > 0 ? (
                <div className="error">
                  Please fix {Object.keys(errors).length} {Object.keys(errors).length === 1 ? "issue" : "issues"} above before submitting.
                </div>
              ) : null}

              <div className="step-actions single-submit-actions">
                <Button type="button" variant="accent" onClick={handleSubmit} disabled={uploadingScreenshot || checkingDuplicates || submitting}>
                  {uploadingScreenshot
                    ? "Uploading..."
                    : checkingDuplicates
                      ? "Checking..."
                      : submitting
                        ? "Submitting..."
                        : "Submit registration"}
                </Button>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
