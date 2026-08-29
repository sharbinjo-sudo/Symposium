"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { GlassPanel } from "@/components/ui/GlassPanel";

function RegistrationCompleteContent() {
  const searchParams = useSearchParams();
  const registrationCode = searchParams.get("registration_code");

  return (
    <div className="section page-shell-block registration-complete-page">
      <div className="container">
        <GlassPanel className="registration-complete-card" tone="strong">
          <div className="registration-complete-icon">✅</div>
          <h1>Registration Received</h1>
          <p className="card-copy">
            Your registration and payment proof have been received. The organizers will verify
            the payment manually before sending the confirmation email.
          </p>

          {registrationCode && (
            <div className="registration-complete-order">
              <span className="section-eyebrow">Registration Code</span>
              <strong className="order-id-display">{registrationCode}</strong>
            </div>
          )}

          <div className="registration-complete-actions">
            <ButtonLink href="/status" variant="primary">
              Check Registration Status
            </ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Back to Home
            </ButtonLink>
          </div>

          <p className="card-copy registration-complete-note">
            Keep your transaction reference and payment screenshot ready until the admin
            verification is completed.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}

export default function RegistrationCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="section page-shell-block registration-complete-page">
          <div className="container">
            <GlassPanel className="registration-complete-card" tone="strong">
              <p className="card-copy">Loading...</p>
            </GlassPanel>
          </div>
        </div>
      }
    >
      <RegistrationCompleteContent />
    </Suspense>
  );
}
