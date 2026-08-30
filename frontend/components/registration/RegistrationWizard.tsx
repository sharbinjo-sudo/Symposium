"use client";

import { startTransition, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ProgressStepper } from "@/components/ui/ProgressStepper";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { ApiError, createIdempotencyKey, precheckRegistration, submitRegistration, uploadScreenshot } from "@/lib/api";
import { siteConfig } from "@/lib/config/site";
import { formatFoodPreference } from "@/lib/format";
import { assignWithLoading } from "@/lib/navigation-transition";
import { createRegistrationSchema, participantSchema } from "@/lib/validation/registration";
import type { EventConfig, ParticipantInput, RegistrationResponse } from "@/lib/types";

const steps = ["Event", "Participant", "Payment", "Review", "Confirm"];
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

function selectedEventSummary(events: EventConfig[]) {
  return events.map((event) => event.name).join(", ");
}

function normalizeSelectedEventCodes(events: EventConfig[], codes: string[]) {
  const availableCodes = new Set(events.map((event) => event.code));
  const normalizedCodes = codes
    .map((code) => code.trim().toUpperCase())
    .filter((code, index, allCodes) => availableCodes.has(code) && allCodes.indexOf(code) === index);

  return normalizedCodes.length > 0 ? normalizedCodes : events[0] ? [events[0].code] : [];
}

function hasExclusiveEventConflict(codes: string[]) {
  return exclusiveEventPairs.some(([firstCode, secondCode]) => codes.includes(firstCode) && codes.includes(secondCode));
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
  return events.find((event) => event.code.toUpperCase() === normalizedCode) ?? events[0];
}

export function RegistrationWizard({ events = siteConfig.technicalEvents, initialEventCode }: RegistrationWizardProps) {
  const availableEvents = events.length > 0 ? events : siteConfig.technicalEvents;
  const initialEvent = getInitialEvent(availableEvents, initialEventCode);
  const [step, setStep] = useState(0);
  const [eventCodes, setEventCodes] = useState<string[]>(() =>
    initialEvent?.code ? [initialEvent.code] : availableEvents[0] ? [availableEvents[0].code] : []
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentUploadToken, setPaymentUploadToken] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInput[]>(() =>
    [emptyParticipant()]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<RegistrationResponse | null>(null);
  const [acknowledgementOpen, setAcknowledgementOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [idempotencyKey] = useState(() => createIdempotencyKey());

  const selectedEvents = eventCodes
    .map((code) => availableEvents.find((item) => item.code === code))
    .filter((event): event is EventConfig => Boolean(event));
  const currentEvent = selectedEvents[0] ?? availableEvents[0];
  const selectedEventNames = selectedEventSummary(selectedEvents);
  const eventCode = currentEvent?.code ?? "";

  const totalAmount = currentEvent.feeAmount;
  const paymentQrCard = getPaymentQrCard(totalAmount);
  const upiPaymentUrl = createUpiPaymentUrl(totalAmount);
  const paymentQrLabel = "Payment QR";
  const registrationFeeLabel = `₹${currentEvent.feeAmount} per participant`;
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

  function syncParticipants(size: number) {
    setParticipants((current) => {
      const next = Array.from({ length: 1 }, (_, index) => current[index] ?? emptyParticipant());
      return next.map((participant, index) => ({
        ...participant,

      }));
    });
  }

  function resetPaymentState() {
    setPaymentReference("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
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

  function updateSelectedEvents(nextCodes: string[]) {
    if (paymentLocked) {
      setSubmitError(paymentLockedMessage);
      return;
    }

    const normalizedCodes = normalizeSelectedEventCodes(availableEvents, nextCodes);
    if (normalizedCodes.length === 0) {
      return;
    }

    if (hasExclusiveEventConflict(normalizedCodes)) {
      setErrors((current) => ({
        ...current,
        eventCodes: eventConflictMessage
      }));
      return;
    }

    setEventCodes(normalizedCodes);
    syncParticipants(1);
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
    setParticipants((current) =>
      current.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, [field]: value } : participant
      )
    );
    setSubmitError("");
    setErrors((current) => {
      const next = { ...current };
      delete next[`participant-${index}-${field}`];
      return next;
    });
  }

  function validateStep() {
    const nextErrors: Record<string, string> = {};

    if (step === 0) {
      if (eventCodes.length === 0) {
        nextErrors.eventCodes = "Choose at least one event to continue.";
      } else if (hasExclusiveEventConflict(eventCodes)) {
        nextErrors.eventCodes = eventConflictMessage;
      }
    }

    if (step === 1) {
      soloParticipants.forEach((participant, index) => {
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
    }

    if (step === 2) {
      if (!paymentReference.trim()) {
        nextErrors.transactionId = "UPI transaction ID is required.";
      } else if (!/^\d{12}$/.test(paymentReference.trim())) {
        nextErrors.transactionId = "Enter the 12-digit UPI transaction ID.";
      }
      if (!paymentDate) {
        nextErrors.paymentDate = "Payment date is required.";
      }
      if (!paymentUploadToken) {
        nextErrors.paymentUploadToken = "Upload the payment screenshot to continue.";
      }
      if (!consentGiven) {
        nextErrors.consentGiven = "Please confirm the privacy note to continue.";
      }
    }

    if (step === 3) {
      const schema = createRegistrationSchema();
      const result = schema.safeParse({
        eventCode,
        eventCodes,
        transactionId: paymentReference,
        paymentDate,
        paymentUploadToken,
        consentGiven,
        participants: soloParticipants
      });

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          nextErrors[issue.path.join(".") || "form"] = issue.message;
        });
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function runDuplicatePrecheck() {
    try {
      if (step === 1) {
        await precheckRegistration({
          participants: soloParticipants.map((participant) => ({
            email: participant.email,
            mobileNumber: participant.mobileNumber
          }))
        });
      }

      if (step === 2) {
        await precheckRegistration({
          transactionId: paymentReference.trim()
        });
      }

      if (step === 3) {
        await precheckRegistration({
          eventCode,
          eventCodes,
          transactionId: paymentReference.trim(),
          participants: soloParticipants.map((participant) => ({
            email: participant.email,
            mobileNumber: participant.mobileNumber
          }))
        });
      }

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

  async function nextStep() {
    if (!validateStep()) {
      return;
    }

    setCheckingDuplicates(true);
    setSubmitError("");
    try {
      if (!(await runDuplicatePrecheck())) {
        return;
      }
    } finally {
      setCheckingDuplicates(false);
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    const previous = Math.max(step - 1, 0);
    if (paymentLocked && previous < 2) {
      setSubmitError(paymentLockedMessage);
      return;
    }
    setStep(previous);
  }

  function handleStepClick(nextStepIndex: number) {
    if (paymentLocked && nextStepIndex < 2) {
      setSubmitError(paymentLockedMessage);
      return;
    }
    setStep(nextStepIndex);
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
    if (!validateStep()) {
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

          if (!(await runDuplicatePrecheck())) {
            return;
          }

          const response = await submitRegistration({
            eventCode,
            eventCodes,
            transactionId: paymentReference.trim(),
            paymentDate,
            paymentUploadToken,
            consentGiven,
            participants: soloParticipants.map((participant) => ({ ...participant })),
            idempotencyKey
          });
          setConfirmation(response);
          setAcknowledgementOpen(true);
          setStep(4);
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
                      <span>V V Nagar, Tisaiyanvillai - 627657</span>
                    </div>

                    <div className="ack-document-meta">
                      <span>Generated on</span>
                      <strong>{formatDisplayDate(confirmation.paymentDate || new Date().toISOString())}</strong>
                      <span>Official acknowledgement</span>
                    </div>
                  </header>

                  <div className="ack-document-body">
                    <section className="ack-document-title">
                      <span className="section-eyebrow">CYBERPUNK'26</span>
                      <h2 id="acknowledgement-modal-title">Registration Acknowledgement</h2>
                      <p>
                        This document confirms that the participant details and payment reference have been received
                        for CYBERPUNK'26, a national-level technical symposium.
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
                        <span>Selected events</span>
                        <strong>{selectedEventNames}</strong>
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
                        <small>CYBERPUNK'26</small>
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
            eyebrow="Registration Flow"
            title="A secure, guided registration experience"
            copy="Move through event selection, participants, payment, and review in a readable timeline for mobile and desktop."
          />
        </div>

        <GlassPanel className="wizard-card wizard-main-card" tone="strong">
          <ProgressStepper steps={steps} activeStep={step} onStepClick={handleStepClick} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
            >
              {step === 0 ? (
                <section className="wizard-stage wizard-event-stage">
                  <div className="mobile-event-select field">
                    <label>Choose events</label>
                    <details className="mobile-event-dropdown">
                      <summary>
                        <span>{selectedEventNames || "Choose one or more events"}</span>
                      </summary>
                      <div className="mobile-event-option-list">
                        {availableEvents.map((event) => (
                          <label key={event.code} className="mobile-event-option">
                            <input
                              type="checkbox"
                              checked={eventCodes.includes(event.code)}
                              onChange={() => handleEventToggle(event.code)}
                            />
                            <span>{event.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                    <div className="registration-event-chip-list">
                      {selectedEvents.map((event) => (
                        <button
                          key={event.code}
                          type="button"
                          className="registration-event-chip"
                          onClick={() => handleEventToggle(event.code)}
                        >
                          {event.name}
                          <span aria-hidden="true">x</span>
                        </button>
                      ))}
                    </div>

                  </div>

                  {errors.eventCodes ? <div className="error registration-event-error">{errors.eventCodes}</div> : null}

                  <div className="event-selector-grid">
                    {availableEvents.map((event) => (
                      <button
                        key={event.code}
                        type="button"
                        className={`event-select-card registration-multi-event-card${
                          eventCodes.includes(event.code) ? " is-selected" : ""
                        }`}
                        onClick={() => handleEventToggle(event.code)}
                        aria-pressed={eventCodes.includes(event.code)}
                      >
                        <span className="event-select-index">0{event.order}</span>
                        <span className="registration-event-checkbox" aria-hidden="true" />
                        <strong>{event.name}</strong>
                        <span>{event.summary}</span>
                      </button>
                    ))}
                  </div>

                  <div className="field selected-events-readout">
                    <label htmlFor="selectedEventsReadout">Selected events</label>
                    <input id="selectedEventsReadout" value={selectedEventNames} readOnly />
                  </div>

                  <GlassPanel className="summary-panel wizard-intro-summary" tone="soft">
                    <div className="summary-row">
                      <span>Selected events</span>
                      <strong>{selectedEventNames}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Registration fee</span>
                      <strong>{registrationFeeLabel}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Registration type</span>
                      <strong>Individual</strong>
                    </div>
                  </GlassPanel>
                </section>
              ) : null}

              {step === 1 ? (
                <section className="wizard-stage wizard-participants-stage">
                  <div className="wizard-two-column wizard-participants-overview">
                    <GlassPanel className="content-panel wizard-team-size-card registration-solo-instruction-card" tone="soft">
                      <p className="helper">
                        <strong>Separate registration required:</strong> Each participant must complete a separate
                        registration. If grouping is required for an event, it will be coordinated on campus.
                      </p>
                    </GlassPanel>

                    <GlassPanel className="summary-panel wizard-participants-summary" tone="soft">
                      <div className="summary-row">
                        <span>Total payable</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Participant count</span>
                        <strong>1 participant</strong>
                      </div>
                    </GlassPanel>
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
                              value={participant.fullName}
                              onChange={(event) => handleParticipantChange(index, "fullName", event.target.value)}
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
                              value={participant.collegeName}
                              onChange={(event) => handleParticipantChange(index, "collegeName", event.target.value)}
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
                              value={participant.mobileNumber}
                              onChange={(event) => handleParticipantChange(index, "mobileNumber", event.target.value)}
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
                              value={participant.email}
                              onChange={(event) => handleParticipantChange(index, "email", event.target.value)}
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
                              value={participant.department}
                              onChange={(event) => handleParticipantChange(index, "department", event.target.value)}
                            />
                            {errors[`participant-${index}-department`] ? (
                              <div className="error">{errors[`participant-${index}-department`]}</div>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`year-${index}`}>Year of study</label>
                            <select
                              id={`year-${index}`}
                              value={participant.yearOfStudy}
                              onChange={(event) => handleParticipantChange(index, "yearOfStudy", event.target.value)}
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
                              value={participant.foodPreference}
                              onChange={(event) => handleParticipantChange(index, "foodPreference", event.target.value)}
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
              ) : null}

              {step === 2 ? (
                <section className="wizard-stage wizard-payment-stage">
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
                            id="paymentReference"
                            value={paymentReference}
                            onChange={(event) => {
                              setPaymentReference(event.target.value.replace(/\D/g, "").slice(0, 12));
                              setErrors((current) => ({ ...current, transactionId: "" }));
                            }}
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
                            id="paymentDate"
                            type="date"
                            value={paymentDate}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(event) => {
                              setPaymentDate(event.target.value);
                              setErrors((current) => ({ ...current, paymentDate: "" }));
                            }}
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
                            setErrors((current) => ({ ...current, consentGiven: "" }));
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
                  {submitError ? <div className="error">{submitError}</div> : null}
                </section>
              ) : null}

              {step === 3 ? (
                <section className="wizard-stage wizard-review-stage">
                  <GlassPanel className="review-panel" tone="soft">
                    <div className="review-grid">
                      <div className="review-row">
                        <span>Event</span>
                        <strong>{selectedEventNames}</strong>
                      </div>
                      <div className="review-row">
                        <span>Registration type</span>
                        <strong>Individual registration</strong>
                      </div>
                      <div className="review-row">
                        <span>Amount</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div className="review-row">
                        <span>Payment</span>
                        <strong>Manual proof uploaded</strong>
                      </div>
                      <div className="review-row">
                        <span>Reference ID</span>
                        <strong className="review-break-all">{paymentReference}</strong>
                      </div>
                      <div className="review-row">
                        <span>Payment status</span>
                        <strong>Pending manual verification</strong>
                      </div>
                    </div>
                  </GlassPanel>

                  <GlassPanel className="review-participants-panel" tone="soft">
                    <div className="review-section-head">
                      <span>Participant</span>
                    </div>
                    {soloParticipants.map((participant, index) => (
                      <div key={index} className="review-participant">
                        <span className="review-participant-name">
                          #{index + 1} - {participant.fullName || "Participant"}
                        </span>
                        <span className="review-participant-detail">{participant.email}</span>
                        <span className="review-participant-detail">{participant.collegeName}</span>
                      </div>
                    ))}
                  </GlassPanel>

                  {submitError ? <div className="error">{submitError}</div> : null}
                </section>
              ) : null}

              {step === 4 ? (
                <section className="wizard-stage wizard-confirm-stage">
                  {confirmation ? (
                    <div className="confirmation-panel">
                      <SuccessAnimation registrationCode={confirmation.registrationCode} />
                      <h3>Registration submitted!</h3>
                      <p>
                        Your registration code is <strong>{confirmation.registrationCode}</strong>.
                      </p>
                      <p>
                        Payment status: <strong>{formatStatusLabel(confirmation.paymentStatus)}</strong>. The
                        confirmation email will be sent after organizer verification.
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
                  ) : null}
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {step < 4 ? (
            <div className="step-actions">
              {step > 0 ? (
                <Button type="button" variant="secondary" onClick={previousStep}>
                  Back
                </Button>
              ) : null}
              {step < 3 ? (
                <Button type="button" variant="primary" onClick={() => void nextStep()} disabled={uploadingScreenshot || checkingDuplicates}>
                  {uploadingScreenshot ? "Uploading..." : checkingDuplicates ? "Checking..." : "Continue"}
                </Button>
              ) : (
                <Button type="button" variant="accent" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit registration"}
                </Button>
              )}
            </div>
          ) : null}
        </GlassPanel>
      </div>
    </div>
  );
}

