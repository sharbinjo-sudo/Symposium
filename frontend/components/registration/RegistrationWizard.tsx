"use client";

import { startTransition, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ProgressStepper } from "@/components/ui/ProgressStepper";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { ApiError, createIdempotencyKey, createRegistrationPaymentOrder, submitRegistration } from "@/lib/api";
import { siteConfig } from "@/lib/config/site";
import { createRegistrationSchema, participantSchema } from "@/lib/validation/registration";
import type { EventConfig, ParticipantInput, RegistrationPaymentOrder, RegistrationResponse } from "@/lib/types";

const steps = ["Event", "Participants", "Team", "Payment", "Review", "Confirm"];

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
  };
};

type RazorpayCheckoutState = {
  orderId: string;
  paymentId: string;
  signature: string;
  paidAt: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  config?: {
    display?: {
      blocks?: Record<
        string,
        {
          name: string;
          instruments: Array<{
            method: string;
          }>;
        }
      >;
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", callback: (response: RazorpayFailureResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

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

  if (message === "Razorpay checkout is only available in the browser.") {
    return "Payment can only be completed in a browser window.";
  }

  if (message === "Unable to load Razorpay checkout." || message === "Razorpay checkout is not available right now.") {
    return "Unable to open secure payment right now. Please try again.";
  }

  if (message === "Razorpay checkout was closed before payment completed.") {
    return "Payment was not completed. You can try again.";
  }

  if (message === "Complete the Razorpay payment before submitting.") {
    return "Complete the payment before submitting your registration.";
  }

  if (message === "Razorpay could not complete the payment.") {
    return "Payment could not be completed. Please try again.";
  }

  return message;
}

function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay checkout is only available in the browser."));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        if (window.Razorpay || existingScript.dataset.loaded === "true") {
          resolve();
          return;
        }
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
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

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfText(text: string, maxChars = 78) {
  if (text.length <= maxChars) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function createPdfBlob(lines: string[]) {
  const streamCommands = ["BT", "/F1 12 Tf", "14 TL", "1 0 0 1 48 792 Tm"];

  for (const line of lines) {
    streamCommands.push(`(${escapePdfText(line)}) Tj`);
    streamCommands.push("T*");
  }

  streamCommands.push("ET");

  const stream = `${streamCommands.join("\n")}\n`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function openRazorpayCheckout(order: RegistrationPaymentOrder): Promise<RazorpayCheckoutState> {
  if (typeof window === "undefined" || !window.Razorpay) {
    return Promise.reject(new Error("Razorpay checkout is not available right now."));
  }

  const RazorpayCheckout = window.Razorpay;

  return new Promise<RazorpayCheckoutState>((resolve, reject) => {
    let settled = false;

    const finishResolve = (value: RazorpayCheckoutState) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    const finishReject = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    const instance = new RazorpayCheckout({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.orderId,
      config: {
        display: {
          blocks: {
            preferredUpi: {
              name: "UPI Apps",
              instruments: [
                {
                  method: "upi"
                }
              ]
            }
          },
          sequence: ["block.preferredUpi"],
          preferences: {
            show_default_blocks: true
          }
        }
      },
      prefill: order.prefill,
      theme: { color: "#b62642" },
      modal: {
        ondismiss: () => finishReject(new Error("Razorpay checkout was closed before payment completed."))
      },
      handler: (response) =>
        finishResolve({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          paidAt: new Date().toISOString()
        })
    });

    instance.on("payment.failed", (response) => {
      finishReject(new Error(response.error?.description ?? "Razorpay could not complete the payment."));
    });

    instance.open();
  });
}

type RegistrationWizardProps = {
  events?: EventConfig[];
};

export function RegistrationWizard({ events = siteConfig.technicalEvents }: RegistrationWizardProps) {
  const availableEvents = events.length > 0 ? events : siteConfig.technicalEvents;
  const initialEvent = availableEvents[0];
  const [step, setStep] = useState(0);
  const [eventCode, setEventCode] = useState(initialEvent?.code ?? "");
  const [teamSize, setTeamSize] = useState(initialEvent?.minTeamSize ?? 1);
  const [teamName, setTeamName] = useState("");
  const [checkoutState, setCheckoutState] = useState<RazorpayCheckoutState | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInput[]>(() =>
    Array.from({ length: initialEvent?.minTeamSize ?? 1 }, (_, index) => emptyParticipant(index === 0))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<RegistrationResponse | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [idempotencyKey] = useState(() => createIdempotencyKey());

  const currentEvent = availableEvents.find((item) => item.code === eventCode) ?? availableEvents[0];

  const totalAmount = calculateTotal(currentEvent.feeAmount, currentEvent.feeType, teamSize);
  const participantNames = participants.map((participant) => participant.fullName || "Participant").join(", ");
  const coordinatorEmail = siteConfig.contacts.find((contact) => contact.label === "Email")?.value ?? "Organizer email";

  function handleDownloadPdf() {
    const registrationCode = confirmation?.registrationCode ?? "CP26-PENDING";
    const paymentReference = confirmation?.paymentReference ?? checkoutState?.paymentId ?? "Pending";
    const paymentDate = confirmation?.paymentDate ?? checkoutState?.paidAt ?? "";
    const paymentProvider = confirmation?.paymentProvider ?? "razorpay";
    const pdfLines = [
      `${siteConfig.eventTitle} Registration Acknowledgement`,
      siteConfig.heroSubtitle,
      "",
      `Registration code: ${registrationCode}`,
      `Event: ${currentEvent.name}`,
      `Track: ${currentEvent.track}`,
      `Team: ${teamName || "Solo entry"}`,
      `Participants: ${participantNames}`,
      `Team size: ${teamSize}`,
      `Amount paid: Rs. ${totalAmount}`,
      `Payment date: ${formatDisplayDate(paymentDate)}`,
      `Payment reference: ${paymentReference}`,
      `Payment provider: ${formatStatusLabel(paymentProvider)}`,
      `Payment status: ${formatStatusLabel(confirmation?.paymentStatus)}`,
      `Email status: ${formatStatusLabel(confirmation?.emailStatus)}`,
      "",
      `Venue: ${siteConfig.venue}`,
      `Location: ${siteConfig.venueDetail}`,
      `Event date: ${formatDisplayDate(siteConfig.eventDate)}`,
      `Coordinator email: ${coordinatorEmail}`,
      "",
      "Keep this acknowledgement for event-day verification and organizer communication."
    ].flatMap((line) => wrapPdfText(line));

    const pdfBlob = createPdfBlob(pdfLines);
    const objectUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${registrationCode.toLowerCase()}-acknowledgement.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
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
    setErrors((current) => {
      const next = { ...current };
      delete next.payment;
      delete next.razorpayOrderId;
      delete next.razorpayPaymentId;
      delete next.razorpaySignature;
      return next;
    });
  }

  function handleEventChange(nextEventCode: string) {
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
        nextErrors.payment = "Complete the Razorpay payment to continue.";
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
        razorpayOrderId: checkoutState?.orderId ?? "",
        razorpayPaymentId: checkoutState?.paymentId ?? "",
        razorpaySignature: checkoutState?.signature ?? "",
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
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleStartPayment() {
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
          await loadRazorpayScript();
          const order = await createRegistrationPaymentOrder({
            eventCode,
            teamName: currentEvent.maxTeamSize > 1 ? teamName.trim() : "",
            teamSize,
            participants,
            idempotencyKey
          });
          const nextCheckoutState = await openRazorpayCheckout(order);
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
            throw new Error("Complete the Razorpay payment before submitting.");
          }

          const response = await submitRegistration({
            eventCode,
            teamName: currentEvent.maxTeamSize > 1 ? teamName : "",
            teamSize,
            razorpayOrderId: checkoutState.orderId,
            razorpayPaymentId: checkoutState.paymentId,
            razorpaySignature: checkoutState.signature,
            consentGiven,
            participants,
            idempotencyKey
          });
          setConfirmation(response);
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
      <div className="container">
        <AnimatedHeading
          eyebrow="Registration Flow"
          title="A secure, guided registration experience"
          copy="Move through event selection, participants, payment, and review in a timeline that stays readable on mobile and desktop."
        />

        <GlassPanel className="wizard-card wizard-main-card" tone="strong">
          <ProgressStepper steps={steps} activeStep={step} onStepClick={setStep} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
            >
              {step === 0 ? (
                <section className="wizard-stage">
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
                      <strong>Rs. {currentEvent.feeAmount}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Team range</span>
                      <strong>
                        {currentEvent.minTeamSize}-{currentEvent.maxTeamSize}
                      </strong>
                    </div>
                  </GlassPanel>
                </section>
              ) : null}

              {step === 1 ? (
                <section className="wizard-stage">
                  <div className="wizard-two-column">
                    <GlassPanel className="content-panel" tone="soft">
                      <div className="field">
                        <label htmlFor="teamSize">Team size</label>
                        <select
                          id="teamSize"
                          value={teamSize}
                          onChange={(event) => {
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
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="helper">Participant cards update automatically to match the selected team size.</div>
                    </GlassPanel>

                    <GlassPanel className="summary-panel" tone="soft">
                      <div className="summary-row">
                        <span>Total payable</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Billing mode</span>
                        <strong>{currentEvent.feeType === "per_team" ? "Per team" : "Per participant"}</strong>
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
                              placeholder="+91 XXXXX XXXXX"
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
                        </div>
                      </GlassPanel>
                    ))}
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section className="wizard-stage wizard-two-column">
                  <GlassPanel className="content-panel" tone="soft">
                    <div className="field">
                      <label htmlFor="teamName">Team name</label>
                      <input id="teamName" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
                      <div className="helper">Helpful for organizer-side identification, especially for 2-member entries.</div>
                      {errors.teamName ? <div className="error">{errors.teamName}</div> : null}
                    </div>
                  </GlassPanel>

                  <GlassPanel className="summary-panel wizard-team-summary" tone="soft">
                    <div className="summary-row">
                      <span>Event</span>
                      <strong>{currentEvent.name}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Leader</span>
                      <strong>{participants[0]?.fullName || "Team leader"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Prize highlight</span>
                      <strong>{currentEvent.prizes[0]}</strong>
                    </div>
                  </GlassPanel>
                </section>
              ) : null}

              {step === 3 ? (
                <section className="wizard-stage wizard-two-column payment-stage">
                  <div className="payment-column">
                    <GlassPanel className="payment-qr-card" tone="strong">
                      <div className="section-eyebrow">Payment Gateway</div>
                      <h3>Pay securely through Razorpay</h3>
                      <div className="tag-row">
                        <span className="tag">Live checkout</span>
                        <span className="tag">Server order</span>
                        <span className="tag">Signature verified</span>
                      </div>
                      <div className="helper">
                        A fresh order is created on the server for this registration. After checkout, the payment
                        signature is verified before your submission is stored.
                      </div>
                      <div className="cta-actions">
                        <Button
                          type="button"
                          variant="accent"
                          onClick={handleStartPayment}
                          disabled={paymentProcessing}
                          magnetic
                        >
                          {paymentProcessing
                            ? "Preparing Razorpay..."
                            : checkoutState
                              ? "Pay again with Razorpay"
                              : "Pay with Razorpay"}
                        </Button>
                      </div>
                    </GlassPanel>

                    <GlassPanel className="content-panel" tone="soft">
                      <div className="summary-row">
                        <span>Selected event</span>
                        <strong>{currentEvent.name}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Billing mode</span>
                        <strong>{currentEvent.feeType === "per_team" ? "Per team" : "Per participant"}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Total payable</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                    </GlassPanel>
                  </div>

                  <div className="payment-column">
                    <GlassPanel className="summary-panel wizard-payment-summary" tone="soft">
                      <div className="summary-row">
                        <span>Amount due</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Verification</span>
                        <strong>Razorpay signature check</strong>
                      </div>
                      <div className="summary-row">
                        <span>Gateway</span>
                        <strong>Standard Checkout</strong>
                      </div>
                      <label className="consent-row">
                        <input
                          type="checkbox"
                          checked={consentGiven}
                          onChange={(event) => setConsentGiven(event.target.checked)}
                        />
                        <span>I confirm that the participant and payment details may be processed to complete the registration.</span>
                      </label>
                      {errors.consentGiven ? <div className="error">{errors.consentGiven}</div> : null}
                      {errors.payment ? <div className="error">{errors.payment}</div> : null}
                      {paymentMessage ? <div className="helper">{paymentMessage}</div> : null}
                      {submitError ? <div className="error">{submitError}</div> : null}
                    </GlassPanel>

                    {checkoutState ? (
                      <GlassPanel className="summary-panel wizard-review-summary" tone="soft">
                        <div className="summary-row">
                          <span>Razorpay order</span>
                          <strong>{checkoutState.orderId}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Payment reference</span>
                          <strong>{checkoutState.paymentId}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Paid on</span>
                          <strong>{formatDisplayDate(checkoutState.paidAt)}</strong>
                        </div>
                      </GlassPanel>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {step === 4 ? (
                <section className="wizard-stage">
                  <GlassPanel className="summary-panel summary-panel-review wizard-review-summary" tone="soft">
                    <div className="summary-row">
                      <span>Event</span>
                      <strong>{currentEvent.name}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Team</span>
                      <strong>{teamName || "Solo entry"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Participants</span>
                      <strong>{participants.map((participant) => participant.fullName || "Participant").join(", ")}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Payment gateway</span>
                      <strong>Razorpay</strong>
                    </div>
                    <div className="summary-row">
                      <span>Payment reference</span>
                      <strong>{checkoutState?.paymentId ?? "Pending"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Razorpay order</span>
                      <strong>{checkoutState?.orderId ?? "Pending"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Total</span>
                      <strong>Rs. {totalAmount}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Payment completed</span>
                      <strong>{checkoutState ? formatDisplayDate(checkoutState.paidAt) : "Not yet completed"}</strong>
                    </div>
                  </GlassPanel>
                  {errors.form ? <div className="error">{errors.form}</div> : null}
                  {submitError ? <div className="error">{submitError}</div> : null}
                </section>
              ) : null}

              {step === 5 ? (
                <section className="confirmation-card">
                  <GlassPanel className="confirmation-hero-card" tone="soft">
                    <div className="section-eyebrow">Acknowledgement</div>
                    <SuccessAnimation registrationCode={confirmation?.registrationCode ?? "CP26-PENDING"} />
                    <h3>Acknowledgement ready</h3>
                    <div className="confirmation-status-pill">
                      Payment: {formatStatusLabel(confirmation?.paymentStatus)}
                    </div>
                    <p className="helper confirmation-hero-copy">
                      Email status: {formatStatusLabel(confirmation?.emailStatus)}. Keep the PDF acknowledgement safe for
                      event-day verification.
                    </p>
                  </GlassPanel>

                  <GlassPanel className="confirmation-receipt-card" tone="soft">
                    <div className="confirmation-receipt-head">
                      <div>
                        <div className="section-eyebrow">Confirmation</div>
                        <h3>Registration submitted successfully</h3>
                      </div>
                      <div className="confirmation-receipt-badge">
                        {confirmation?.registrationCode ?? "CP26-PENDING"}
                      </div>
                    </div>
                    <p className="card-copy">
                      Your registration is now recorded. The payment was processed through{" "}
                      <strong>{formatStatusLabel(confirmation?.paymentProvider)}</strong> and is currently{" "}
                      <strong>{formatStatusLabel(confirmation?.paymentStatus)}</strong>.
                    </p>

                    <div className="confirmation-meta-grid">
                      <div className="confirmation-meta-item">
                        <span className="confirmation-meta-label">Event date</span>
                        <strong className="confirmation-meta-value">{formatDisplayDate(siteConfig.eventDate)}</strong>
                      </div>
                      <div className="confirmation-meta-item">
                        <span className="confirmation-meta-label">Venue</span>
                        <strong className="confirmation-meta-value">{siteConfig.venueDetail}</strong>
                      </div>
                      <div className="confirmation-meta-item">
                        <span className="confirmation-meta-label">Coordinator mail</span>
                        <strong className="confirmation-meta-value">{coordinatorEmail}</strong>
                      </div>
                    </div>

                    <div className="confirmation-detail-list">
                      <div className="confirmation-detail-row">
                        <span>Registration code</span>
                        <strong>{confirmation?.registrationCode ?? "CP26-PENDING"}</strong>
                      </div>
                      <div className="confirmation-detail-row">
                        <span>Event</span>
                        <strong>{currentEvent.name}</strong>
                      </div>
                      <div className="confirmation-detail-row">
                        <span>Team</span>
                        <strong>{teamName || "Solo entry"}</strong>
                      </div>
                      <div className="confirmation-detail-row">
                        <span>Participants</span>
                        <strong>{participantNames}</strong>
                      </div>
                      <div className="confirmation-detail-row">
                        <span>Amount paid</span>
                        <strong>Rs. {totalAmount}</strong>
                      </div>
                      <div className="confirmation-detail-row">
                        <span>Payment reference</span>
                        <strong>{confirmation?.paymentReference ?? checkoutState?.paymentId ?? "Pending"}</strong>
                      </div>
                      <div className="confirmation-detail-row">
                        <span>Payment date</span>
                        <strong>{formatDisplayDate(confirmation?.paymentDate ?? checkoutState?.paidAt ?? "")}</strong>
                      </div>
                    </div>

                    <div className="cta-actions confirmation-actions">
                      <Button variant="primary" onClick={handleDownloadPdf}>
                        Download PDF
                      </Button>
                      <Button variant="secondary" onClick={() => window.location.assign("/status")}>
                        Check status
                      </Button>
                      <Button variant="accent" onClick={() => window.print()}>
                        Print acknowledgement
                      </Button>
                      <Button variant="secondary" onClick={() => window.location.assign("/")}>
                        Back to home
                      </Button>
                      <Button variant="secondary" onClick={() => window.location.reload()}>
                        Start another registration
                      </Button>
                    </div>
                  </GlassPanel>
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
                <Button type="button" variant="primary" onClick={nextStep} magnetic>
                  Continue
                </Button>
              ) : (
                <Button type="button" variant="accent" onClick={handleSubmit} disabled={submitting} magnetic>
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
