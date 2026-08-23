"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { GlassPanel } from "@/components/ui/GlassPanel";

function RegistrationCompleteContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="section page-shell-block registration-complete-page">
      <div className="container">
        <GlassPanel className="registration-complete-card" tone="strong">
          <div className="registration-complete-icon">✅</div>
          <h1>Payment Received</h1>
          <p className="card-copy">
            Your payment has been processed by Cashfree. If you completed the
            registration form after payment, your registration is confirmed.
          </p>

          {orderId && (
            <div className="registration-complete-order">
              <span className="section-eyebrow">Order Reference</span>
              <strong className="order-id-display">{orderId}</strong>
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
            If you did not complete the registration form, please go back and
            submit it using the same browser. Your payment is linked to this
            session.
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
