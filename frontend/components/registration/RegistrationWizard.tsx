"use client";

import { startTransition, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ProgressStepper } from "@/components/ui/ProgressStepper";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { ApiError, createIdempotencyKey, createRegistrationPaymentOrder, submitRegistration } from "@/lib/api";
import { siteConfig } from "@/lib/config/site";
import { formatFoodPreference, formatMemberCount, formatTeamRange } from "@/lib/format";
import { assignWithLoading } from "@/lib/navigation-transition";
import { createRegistrationSchema, participantSchema } from "@/lib/validation/registration";
import type { EventConfig, ParticipantInput, RegistrationPaymentOrder, RegistrationResponse } from "@/lib/types";

const steps = ["Event", "Participants", "Team", "Payment", "Review", "Confirm"];

type CashfreeCheckoutState = {
  orderId: string;
  paidAt: string;
};

type CashfreePaymentResult = {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
};

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: string;
      }) => Promise<CashfreePaymentResult | null>;
    };
  }
}

let cashfreeScriptPromise: Promise<void> | null = null;

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

  if (message === "Cashfree checkout is only available in the browser.") {
    return "Payment can only be completed in a browser window.";
  }

  if (message === "Unable to load Cashfree checkout." || message === "Cashfree checkout is not available right now.") {
    return "Unable to open secure payment right now. Please try again.";
  }

  if (message === "Cashfree checkout was closed before payment completed.") {
    return "Payment was not completed. You can try again.";
  }

  if (message === "Complete the Cashfree payment before submitting.") {
    return "Complete the payment before submitting your registration.";
  }

  if (message === "Cashfree could not complete the payment.") {
    return "Payment could not be completed. Please try again.";
  }

  if (message === "Cashfree returned an incomplete payment response.") {
    return "Payment response was incomplete. Please try again.";
  }

  return message;
}

function loadCashfreeScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cashfree checkout is only available in the browser."));
  }

  if (window.Cashfree) {
    return Promise.resolve();
  }

  if (!cashfreeScriptPromise) {
    cashfreeScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
      const rejectAndAllowRetry = () => {
        cashfreeScriptPromise = null;
        reject(new Error("Unable to load Cashfree checkout."));
      };
      const resolveIfReady = (scriptToRemove?: HTMLScriptElement) => {
        if (window.Cashfree) {
          resolve();
          return;
        }
        scriptToRemove?.remove();
        rejectAndAllowRetry();
      };

      if (existingScript) {
        if (window.Cashfree) {
          resolve();
          return;
        }
        if (existingScript.dataset.loaded === "true") {
          existingScript.remove();
        } else {
          existingScript.addEventListener(
            "load",
            () => {
              existingScript.dataset.loaded = "true";
              resolveIfReady(existingScript);
            },
            { once: true }
          );
          existingScript.addEventListener(
            "error",
            () => {
              existingScript.remove();
              rejectAndAllowRetry();
            },
            { once: true }
          );
          return;
        }
      }

      if (window.Cashfree) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolveIfReady(script);
      };
      script.onerror = () => {
        script.remove();
        rejectAndAllowRetry();
      };
      document.body.appendChild(script);
    });
  }

  return cashfreeScriptPromise;
}

function emptyParticipant(isTeamLeader: boolean): ParticipantInput {
  return {
    fullName: "",
    collegeName: "",
    rollNumber: "",
    mobileNumber: "",
    email: "",
    department: "",
    yearOfStudy: "",
    foodPreference: "",
    isTeamLeader
  };
}

function calculateTotal(feeAmount: number, feeType: string, teamSize: number) {
  return feeType === "per_team" ? feeAmount : feeAmount * teamSize;
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

async function openCashfreeCheckout(order: RegistrationPaymentOrder): Promise<CashfreeCheckoutState> {
  if (typeof window === "undefined" || !window.Cashfree) {
    throw new Error("Cashfree checkout is not available right now.");
  }

  const cashfreeInstance = window.Cashfree({
    mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox"
  });

  if (!cashfreeInstance) {
    throw new Error("Cashfree checkout is not available right now.");
  }

  try {
    const result = await cashfreeInstance.checkout({
      paymentSessionId: order.paymentSessionId,
      redirectTarget: "_modal"
    });

    if (!result) {
      throw new Error("Cashfree checkout was closed before payment completed.");
    }

    if (result.paymentStatus === "SUCCESS" || result.orderStatus === "PAID") {
      return {
        orderId: result.orderId || order.orderId,
        paidAt: new Date().toISOString()
      };
    }

    if (result.paymentStatus === "FAILED" || result.orderStatus === "TERMINATED") {
      throw new Error("Payment could not be completed. Please try again.");
    }

    return {
      orderId: result.orderId || order.orderId,
      paidAt: new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cashfree")) {
      throw error;
    }
    throw new Error("Cashfree checkout was closed before payment completed.");
  }
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
  const [eventCode, setEventCode] = useState(initialEvent?.code ?? "");
  const [teamSize, setTeamSize] = useState(initialEvent?.minTeamSize ?? 1);
  const [teamName, setTeamName] = useState("");
  const [checkoutState, setCheckoutState] = useState<CashfreeCheckoutState | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInput[]>(() =>
    Array.from({ length: initialEvent?.minTeamSize ?? 1 }, (_, index) => emptyParticipant(index === 0))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<RegistrationResponse | null>(null);
  const [acknowledgementOpen, setAcknowledgementOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [idempotencyKey] = useState(() => createIdempotencyKey());

  const currentEvent = availableEvents.find((item) => item.code === eventCode) ?? availableEvents[0];

  const totalAmount = calculateTotal(currentEvent.feeAmount, currentEvent.feeType, teamSize);
  const registrationFeeLabel =
    currentEvent.feeType === "per_team" ? `₹${currentEvent.feeAmount} per team` : `₹${currentEvent.feeAmount} per member`;
  const billingModeLabel = currentEvent.feeType === "per_team" ? "Per team" : "Per member";
  const teamLabel = teamName || (teamSize === 1 ? "Solo entry" : `Team of ${teamSize}`);
  const leadParticipant = participants[0] ?? emptyParticipant(true);
  const participantNames = participants.map((participant) => participant.fullName || "Participant").join(", ");
  const participantFoodPreferences = participants
    .map((participant) => formatFoodPreference(participant.foodPreference))
    .join(", ");
  const coordinatorEmail = siteConfig.contacts.find((contact) => contact.label === "Mail ID")?.value ?? "Organizer email";
  const paymentLocked = Boolean(checkoutState);
  const paymentLockedMessage =
    "Payment is already received. Submit this registration, or start another registration if you need to change details.";

  useEffect(() => {
    const isAcknowledgementVisible = Boolean(confirmation && acknowledgementOpen);
    document.body.classList.toggle("is-printing-acknowledgement", isAcknowledgementVisible);

    return () => {
      document.body.classList.remove("is-printing-acknowledgement");
    };
  }, [acknowledgementOpen, confirmation]);

  function handleDownloadPdf() {
    setAcknowledgementOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  }

  function syncParticipants(size: number) {
    setParticipants((current) => {
      const next = Array.from({ length: size }, (_, index) => current[index] ?? emptyParticipant(index === 0));
      return next.map((participant, index) => ({
        ...participant,
        isTeamLeader: index === 0
      }));
    });
  }

  function resetPaymentState() {
    setCheckoutState(null);
    setPaymentMessage("");
    setSubmitError("");
    setErrors((current) => {
      const next = { ...current };
      delete next.payment;
      delete next.cashfreeOrderId;
      return next;
    });
  }

  function handleEventChange(nextEventCode: string) {
    if (paymentLocked) {
      setSubmitError(paymentLockedMessage);
      return;
    }

    const nextEvent = availableEvents.find((item) => item.code === nextEventCode);
    if (!nextEvent) {
      return;
    }
    setEventCode(nextEventCode);
    setTeamSize(nextEvent.minTeamSize);
    syncParticipants(nextEvent.minTeamSize);
    resetPaymentState();
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
  }

  function validateStep() {
    const nextErrors: Record<string, string> = {};

    if (step === 0 && !eventCode) {
      nextErrors.eventCode = "Choose an event to continue.";
    }

    if (step === 1) {
      participants.forEach((participant, index) => {
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

        const trimmedRollNumber = participant.rollNumber.trim();
        if (!trimmedRollNumber) {
          nextErrors[`participant-${index}-rollNumber`] = "Roll number is required.";
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
      if (currentEvent.maxTeamSize > 1 && !teamName.trim()) {
        nextErrors.teamName = "Team name is required.";
      } else if (teamName.trim().length > 100) {
        nextErrors.teamName = "Team name is too long.";
      }
    }

    if (step === 3) {
      if (!checkoutState) {
        nextErrors.payment = "Complete the Cashfree payment to continue.";
      }
      if (!consentGiven) {
        nextErrors.consentGiven = "Please confirm the privacy note to continue.";
      }
    }

    if (step === 4) {
      const schema = createRegistrationSchema(currentEvent);
      const result = schema.safeParse({
        eventCode,
        teamName,
        teamSize,
        cashfreeOrderId: checkoutState?.orderId ?? "",
        consentGiven,
        participants
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

  function nextStep() {
    if (!validateStep()) {
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    const previous = Math.max(step - 1, 0);
    if (paymentLocked && previous < 3) {
      setSubmitError(paymentLockedMessage);
      return;
    }
    setStep(previous);
  }

  function handleStepClick(nextStepIndex: number) {
    if (paymentLocked && nextStepIndex < 3) {
      setSubmitError(paymentLockedMessage);
      return;
    }
    setStep(nextStepIndex);
  }

  function handleStartPayment() {
    if (paymentProcessing) {
      return;
    }

    if (checkoutState) {
      setPaymentMessage("Payment is already received. Continue to review and submit your registration.");
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (!consentGiven) {
      nextErrors.consentGiven = "Please confirm the privacy note to continue.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }

    setPaymentProcessing(true);
    setPaymentMessage("");
    setSubmitError("");

    startTransition(() => {
      void (async () => {
        try {
          await loadCashfreeScript();
          const order = await createRegistrationPaymentOrder({
            eventCode,
            teamName: currentEvent.maxTeamSize > 1 ? teamName.trim() : "",
            teamSize,
            participants,
            idempotencyKey
          });
          const nextCheckoutState = await openCashfreeCheckout(order);
          setCheckoutState(nextCheckoutState);
          setPaymentMessage("Payment received. Review your details and submit the registration.");
          setErrors((current) => {
            const next = { ...current };
            delete next.payment;
            delete next.consentGiven;
            return next;
          });
        } catch (error) {
          if (error instanceof ApiError) {
            setErrors((current) => ({ ...current, ...error.fieldErrors }));
            setSubmitError(getReadableUiError(error, "Unable to start secure payment right now. Please try again."));
          } else {
            setSubmitError(getReadableUiError(error, "Unable to start secure payment right now. Please try again."));
          }
        } finally {
          setPaymentProcessing(false);
        }
      })();
    });
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
          if (!checkoutState) {
            throw new Error("Complete the Cashfree payment before submitting.");
          }

          const response = await submitRegistration({
            eventCode,
            teamName: currentEvent.maxTeamSize > 1 ? teamName : "",
            teamSize,
            cashfreeOrderId: checkoutState.orderId,
            consentGiven,
            participants,
            idempotencyKey
          });
          setConfirmation(response);
          setAcknowledgementOpen(true);
          setStep(5);
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
                      <strong>{formatDisplayDate(confirmation.paymentDate || checkoutState?.paidAt || new Date().toISOString())}</strong>
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
                        <span>Selected event</span>
                        <strong>{currentEvent.name}</strong>
                      </div>
                      <div>
                        <span>Registration type</span>
                        <strong>{teamLabel}</strong>
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
                        <span>{teamSize === 1 ? "Participant details" : "Team details"}</span>
                      </div>

                      <table className="ack-table">
                        <tbody>
                          {teamSize === 1 ? (
                            <>
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
                                <th>Roll number</th>
                                <td>{leadParticipant.rollNumber || "Not provided"}</td>
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
                            </>
                          ) : (
                            <>
                              <tr>
                                <th>Team name</th>
                                <td>{teamLabel}</td>
                              </tr>
                              <tr>
                                <th>Team size</th>
                                <td>{formatMemberCount(teamSize)}</td>
                              </tr>
                              <tr>
                                <th>Team members</th>
                                <td>{participantNames}</td>
                              </tr>
                              <tr>
                                <th>Food preferences</th>
                                <td>{participantFoodPreferences}</td>
                              </tr>
                            </>
                          )}
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
                            <td>{confirmation.paymentReference || checkoutState?.orderId || "Pending"}</td>
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
                    <label htmlFor="mobileEventCode">Choose event</label>
                    <select
                      id="mobileEventCode"
                      value={eventCode}
                      onChange={(event) => handleEventChange(event.target.value)}
                    >
                      {availableEvents.map((event) => (
                        <option key={event.code} value={event.code}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                    <div className="helper">{currentEvent.summary}</div>
                  </div>

                  <div className="event-selector-grid">
                    {availableEvents.map((event) => (
                      <button
                        key={event.code}
                        type="button"
                        className={`event-select-card${event.code === eventCode ? " is-selected" : ""}`}
                        onClick={() => handleEventChange(event.code)}
                      >
                        <span className="event-select-index">0{event.order}</span>
                        <strong>{event.name}</strong>
                        <span>{event.summary}</span>
                      </button>
                    ))}
                  </div>

                  <GlassPanel className="summary-panel wizard-intro-summary" tone="soft">
                    <div className="summary-row">
                      <span>Selected event</span>
                      <strong>{currentEvent.name}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Registration fee</span>
                      <strong>{registrationFeeLabel}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Team range</span>
                      <strong>{formatTeamRange(currentEvent.minTeamSize, currentEvent.maxTeamSize)}</strong>
                    </div>
                  </GlassPanel>
                </section>
              ) : null}

              {step === 1 ? (
                <section className="wizard-stage wizard-participants-stage">
                  <div className="wizard-two-column wizard-participants-overview">
                    <GlassPanel className="content-panel wizard-team-size-card" tone="soft">
                      <div className="field">
                        <label htmlFor="teamSize">Team size</label>
                        <select
                          id="teamSize"
                          value={teamSize}
                          onChange={(event) => {
                            if (paymentLocked) {
                              setSubmitError(paymentLockedMessage);
                              return;
                            }
                            const nextSize = Number(event.target.value);
                            setTeamSize(nextSize);
                            syncParticipants(nextSize);
                            resetPaymentState();
                          }}
                        >
                          {Array.from(
                            { length: currentEvent.maxTeamSize - currentEvent.minTeamSize + 1 },
                            (_, index) => currentEvent.minTeamSize + index
                          ).map((size) => (
                            <option key={size} value={size}>
                              {formatMemberCount(size)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="helper">Participant cards update automatically to match the selected team size.</div>
                    </GlassPanel>

                    <GlassPanel className="summary-panel wizard-participants-summary" tone="soft">
                      <div className="summary-row">
                        <span>Total payable</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Billing mode</span>
                        <strong>{billingModeLabel}</strong>
                      </div>
                    </GlassPanel>
                  </div>

                  <div className={`participants-grid${participants.length === 1 ? " is-single" : ""}`}>
                    {participants.map((participant, index) => (
                      <GlassPanel key={index} className="participant-card" tone="soft">
                        <div className="tag-row">
                          <span className="tag">Participant {index + 1}</span>
                          {index === 0 ? <span className="tag">Team Leader</span> : null}
                        </div>
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
                            <label htmlFor={`roll-${index}`}>Roll number</label>
                            <input
                              id={`roll-${index}`}
                              placeholder="Example: 22AI001"
                              value={participant.rollNumber}
                              onChange={(event) => handleParticipantChange(index, "rollNumber", event.target.value)}
                            />
                            {errors[`participant-${index}-rollNumber`] ? (
                              <div className="error">{errors[`participant-${index}-rollNumber`]}</div>
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
                <section className="wizard-stage wizard-team-stage">
                  {currentEvent.maxTeamSize > 1 ? (
                    <div className="field">
                      <label htmlFor="teamName">Team name</label>
                      <input
                        id="teamName"
                        type="text"
                        value={teamName}
                        onChange={(event) => {
                          if (paymentLocked) {
                            setSubmitError(paymentLockedMessage);
                            return;
                          }
                          setTeamName(event.target.value);
                        }}
                        placeholder="Enter team name"
                        maxLength={100}
                      />
                      {errors.teamName ? <div className="error">{errors.teamName}</div> : null}
                      <div className="helper">Required for team events</div>
                    </div>
                  ) : (
                    <div className="helper">Solo event - no team name needed.</div>
                  )}

                  <GlassPanel className="summary-panel" tone="soft">
                    <div className="summary-row">
                      <span>Event</span>
                      <strong>{currentEvent.name}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Team size</span>
                      <strong>{formatMemberCount(teamSize)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Total amount</span>
                      <strong>Rs. {totalAmount}</strong>
                    </div>
                  </GlassPanel>
                </section>
              ) : null}

              {step === 3 ? (
                <section className="wizard-stage wizard-payment-stage">
                  <GlassPanel className="payment-info-panel" tone="soft">
                    <div className="summary-row">
                      <span>Amount to pay</span>
                      <strong>Rs. {totalAmount}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Payment method</span>
                      <strong>Cashfree - UPI / Cards / Net Banking</strong>
                    </div>
                  </GlassPanel>

                  {!checkoutState ? (
                    <div className="payment-action-area">
                      <label className="consent-row">
                        <input
                          type="checkbox"
                          checked={consentGiven}
                          onChange={(event) => setConsentGiven(event.target.checked)}
                        />
                        <span>
                          I confirm my details are correct and I consent to the processing of my registration.
                        </span>
                      </label>
                      {errors.consentGiven ? <div className="error">{errors.consentGiven}</div> : null}

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleStartPayment}
                        disabled={paymentProcessing || !consentGiven}
                      >
                        {paymentProcessing ? "Opening payment..." : "Pay Rs. " + totalAmount}
                      </Button>
                    </div>
                  ) : (
                    <div className="payment-success-area">
                      <SuccessAnimation registrationCode={confirmation?.registrationCode ?? "CP26-PENDING"} />
                      <p className="payment-success-text">Payment received successfully!</p>
                      <p className="helper">Order ID: {checkoutState.orderId}</p>
                    </div>
                  )}

                  {errors.payment ? <div className="error">{errors.payment}</div> : null}
                  {paymentMessage ? <div className="helper">{paymentMessage}</div> : null}
                  {submitError ? <div className="error">{submitError}</div> : null}
                </section>
              ) : null}

              {step === 4 ? (
                <section className="wizard-stage wizard-review-stage">
                  <GlassPanel className="review-panel" tone="soft">
                    <div className="review-grid">
                      <div className="review-row">
                        <span>Event</span>
                        <strong>{currentEvent.name}</strong>
                      </div>
                      <div className="review-row">
                        <span>Team</span>
                        <strong>{teamLabel}</strong>
                      </div>
                      <div className="review-row">
                        <span>Team size</span>
                        <strong>{formatMemberCount(teamSize)}</strong>
                      </div>
                      <div className="review-row">
                        <span>Amount</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div className="review-row">
                        <span>Payment</span>
                        <strong>Paid via Cashfree</strong>
                      </div>
                      <div className="review-row">
                        <span>Order ID</span>
                        <strong className="review-break-all">{checkoutState?.orderId}</strong>
                      </div>
                    </div>
                  </GlassPanel>

                  <GlassPanel className="review-participants-panel" tone="soft">
                    <div className="review-section-head">
                      <span>Participants ({teamSize})</span>
                    </div>
                    {participants.map((participant, index) => (
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

              {step === 5 ? (
                <section className="wizard-stage wizard-confirm-stage">
                  {confirmation ? (
                    <div className="confirmation-panel">
                      <SuccessAnimation registrationCode={confirmation.registrationCode} />
                      <h3>Registration submitted!</h3>
                      <p>
                        Your registration code is <strong>{confirmation.registrationCode}</strong>.
                      </p>
                      <p>
                        Payment status: <strong>{formatStatusLabel(confirmation.paymentStatus)}</strong>
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

          {step < 5 ? (
            <div className="step-actions">
              {step > 0 ? (
                <Button type="button" variant="secondary" onClick={previousStep}>
                  Back
                </Button>
              ) : null}
              {step < 4 ? (
                <Button type="button" variant="primary" onClick={nextStep}>
                  Continue
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

