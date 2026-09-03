"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { StatusChip } from "@/components/ui/StatusChip";
import { ApiError, checkRegistrationStatus } from "@/lib/api";
import { siteConfig } from "@/lib/config/site";
import { formatFoodPreference } from "@/lib/format";
import type { RegistrationStatusResponse } from "@/lib/types";

type FieldErrors = {
  registrationCode?: string;
  email?: string;
  form?: string;
};

function clearFieldError(errors: FieldErrors, field: keyof FieldErrors) {
  if (!errors[field]) {
    return errors;
  }

  return { ...errors, [field]: undefined };
}

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAmount(value: string) {
  const numericValue = Number.parseFloat(value);
  if (Number.isNaN(numericValue)) {
    return value;
  }

  return numericValue.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDate(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", withTime
    ? {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    : {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
}

function paymentTone(status: string) {
  if (status === "verified") {
    return "verified" as const;
  }
  if (status === "rejected") {
    return "rejected" as const;
  }
  if (status === "needs_clarification") {
    return "clarify" as const;
  }
  if (status === "pending_verification") {
    return "pending" as const;
  }
  return "neutral" as const;
}

function emailTone(status: string) {
  if (status === "sent") {
    return "verified" as const;
  }
  if (status === "failed") {
    return "rejected" as const;
  }
  if (status === "pending") {
    return "pending" as const;
  }
  return "neutral" as const;
}

function registrationTone(status: string) {
  if (status === "submitted") {
    return "verified" as const;
  }
  if (status === "cancelled") {
    return "rejected" as const;
  }
  return "neutral" as const;
}

export function RegistrationStatusLookup() {
  const [registrationCode, setRegistrationCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationStatusResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const organizerContact = siteConfig.contacts.find((item) => item.label === "Mail ID")?.value ?? "Contact the organizers.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = registrationCode.trim().toUpperCase();
    const trimmedEmail = email.trim().toLowerCase();
    const nextErrors: FieldErrors = {};

    if (!trimmedCode) {
      nextErrors.registrationCode = "Registration code is required.";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSuccessMessage("");
      return;
    }

    setLoading(true);
    setFieldErrors({});
    setSuccessMessage("");

    try {
      const response = await checkRegistrationStatus({
        registrationCode: trimmedCode,
        email: trimmedEmail
      });
      setResult(response);
      setRegistrationCode(trimmedCode);
      setEmail(trimmedEmail);
      setSuccessMessage("Latest registration details loaded from the symposium database.");
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors({
          registrationCode: error.fieldErrors.registrationCode,
          email: error.fieldErrors.email,
          form: error.message
        });
      } else {
        setFieldErrors({
          form: "Unable to load the registration status right now. Please try again in a moment."
        });
      }

      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section section-tone-plain status-check-section">
      <div className="container status-check-layout">
        <Reveal className="status-check-intro-reveal" delay={0.04} y={24}>
          <div className="status-check-intro-block">
            <div className="status-check-intro-heading">
              <div className="section-eyebrow">Status lookup</div>
              <h1 className="status-check-title">Track a submitted registration in one place</h1>
            </div>
            <p className="card-copy status-check-intro-copy">
              Enter your registration code and participant email to view the latest organizer update.
            </p>
          </div>
        </Reveal>

        <Reveal className="status-check-form-reveal" delay={0.1} y={28}>
          <GlassPanel as="form" className="status-check-form-card" tone="soft" onSubmit={handleSubmit}>
            <div className="status-check-form-head">
              <div>
                <div className="section-eyebrow">Lookup form</div>
                <h2>Check your latest status</h2>
              </div>
            </div>

            <div className="status-check-form-grid">
              <label className="status-check-field">
                <span>Registration code</span>
                <input
                  type="text"
                  value={registrationCode}
                  onChange={(event) => {
                    setRegistrationCode(event.target.value.toUpperCase());
                    setFieldErrors((current) => clearFieldError(clearFieldError(current, "registrationCode"), "form"));
                  }}
                  placeholder="CP26-RN-0XXX"
                  autoComplete="off"
                />
                {fieldErrors.registrationCode ? <div className="error">{fieldErrors.registrationCode}</div> : null}
              </label>

              <label className="status-check-field">
                <span>Participant email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => clearFieldError(clearFieldError(current, "email"), "form"));
                  }}
                  placeholder="participant@example.com"
                  autoComplete="email"
                />
                {fieldErrors.email ? <div className="error">{fieldErrors.email}</div> : null}
              </label>
            </div>

            {fieldErrors.form ? <div className="error">{fieldErrors.form}</div> : null}
            {successMessage ? <div className="status-check-success">{successMessage}</div> : null}

            <div className="status-check-submit-row">
              <Button type="submit" variant="primary" magnetic disabled={loading}>
                {loading ? "Checking..." : "Check status"}
              </Button>
            </div>
          </GlassPanel>
        </Reveal>

        <Reveal className="status-check-result-reveal" delay={0.16} y={30}>
          <div ref={resultRef} className="status-check-result-anchor" aria-hidden="true" />
          <GlassPanel className="status-check-result-card" tone="soft">
            <AnimatePresence mode="wait" initial={false}>
              {result ? (
                <motion.div
                  key={result.registrationCode}
                  className="status-check-result-motion"
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="status-check-result-head">
                    <div>
                      <div className="section-eyebrow">Live record</div>
                      <h2>{result.registrationCode}</h2>
                    </div>
                    <div className="status-check-chip-row">
                      <StatusChip tone={paymentTone(result.paymentStatus)}>
                        {`Payment ${formatStatusLabel(result.paymentStatus)}`}
                      </StatusChip>
                      <StatusChip tone={registrationTone(result.registrationStatus)}>
                        {formatStatusLabel(result.registrationStatus)}
                      </StatusChip>
                      <StatusChip tone={emailTone(result.emailStatus)}>
                        {`Email ${formatStatusLabel(result.emailStatus)}`}
                      </StatusChip>
                    </div>
                  </div>

                  <p className="card-copy status-check-result-copy">
                    This registration is linked to <strong>{result.eventName}</strong> and currently shows a{" "}
                    <strong>{formatStatusLabel(result.paymentStatus)}</strong> payment state.
                  </p>

                  <div className="status-check-meta-grid">
                    <div className="status-check-meta-card">
                      <span>Event</span>
                      <strong>{result.eventName}</strong>
                    </div>
                    <div className="status-check-meta-card">
                      <span>Amount paid</span>
                      <strong>{`Rs. ${formatAmount(result.amountPaid)}`}</strong>
                    </div>
                    <div className="status-check-meta-card">
                      <span>Payment date</span>
                      <strong>{formatDate(result.paymentDate)}</strong>
                    </div>
                    <div className="status-check-meta-card">
                      <span>Last updated</span>
                      <strong>{formatDate(result.updatedAt, true)}</strong>
                    </div>
                  </div>

                  <div className="status-check-detail-list">
                    <div className="status-check-detail-row">
                      <span>Registration type</span>
                      <strong>Individual entry</strong>
                    </div>
                    <div className="status-check-detail-row">
                      <span>Lead participant</span>
                      <strong>{result.leadParticipantName}</strong>
                    </div>
                    <div className="status-check-detail-row">
                      <span>Email used</span>
                      <strong>{result.participantEmail}</strong>
                    </div>
                    <div className="status-check-detail-row">
                      <span>Participants</span>
                      <strong>{result.participantNames.join(", ")}</strong>
                    </div>
                    <div className="status-check-detail-row">
                      <span>Food preference</span>
                      <strong>{(result.participantFoodPreferences ?? []).map(formatFoodPreference).join(", ")}</strong>
                    </div>
                    <div className="status-check-detail-row">
                      <span>Payment provider</span>
                      <strong>{formatStatusLabel(result.paymentProvider)}</strong>
                    </div>
                    <div className="status-check-detail-row">
                      <span>Payment reference</span>
                      <strong>{result.paymentReference}</strong>
                    </div>
                    <div className="status-check-detail-row">
                      <span>Submitted</span>
                      <strong>{formatDate(result.submittedAt, true)}</strong>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="status-check-result-motion status-check-empty"
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="section-eyebrow">Waiting for a lookup</div>
                  <h2>No registration loaded yet</h2>
                  <p className="card-copy">
                    Enter the code and email from your acknowledgement. Payment, email, event details, and the latest
                    organizer update will appear here.
                  </p>
                  <div className="status-check-support-grid">
                    <div className="status-check-hint-card">
                      <span>Need your code?</span>
                      <strong>Find it on the acknowledgement PDF, like CP26-RN-0XXX.</strong>
                    </div>
                    <div className="status-check-hint-card">
                      <span>Need help?</span>
                      <strong>{organizerContact}</strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>
        </Reveal>
      </div>
    </section>
  );
}
