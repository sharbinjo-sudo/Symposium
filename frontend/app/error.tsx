"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Route recovered from a client error:", error);
  }, [error]);

  return (
    <section className="error-recovery-page" role="alert">
      <div className="error-recovery-card">
        <div className="page-transition-badge">Page Recovery</div>
        <h1>Loading page again</h1>
        <p>
          Chrome may have restored an old page state. Try again from here, or reload the page to fetch a fresh copy.
        </p>
        <div className="recovery-action-row">
          <button type="button" className="recovery-button recovery-button-primary" onClick={reset}>
            Try again
          </button>
          <button type="button" className="recovery-button recovery-button-secondary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="recovery-button recovery-button-secondary" href="/">
            Go home
          </a>
        </div>
      </div>
    </section>
  );
}
