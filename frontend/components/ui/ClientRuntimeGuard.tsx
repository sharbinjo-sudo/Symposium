"use client";

import { useEffect, useState } from "react";

const AUTO_RELOAD_KEY = "cp26:last-runtime-reload";
const AUTO_RELOAD_COOLDOWN_MS = 15000;

const RECOVERABLE_PATTERNS = [
  "chunkloaderror",
  "loading chunk",
  "failed to fetch dynamically imported module",
  "importing a module script failed",
  "client-side exception",
  "hydration failed",
  "minified react error"
];

const STALE_ASSET_PATTERNS = [
  "chunkloaderror",
  "loading chunk",
  "failed to fetch dynamically imported module",
  "importing a module script failed"
];

function getReasonText(reason: unknown) {
  if (reason instanceof Error) {
    return `${reason.name}: ${reason.message}`;
  }

  if (typeof reason === "string") {
    return reason;
  }

  if (reason && typeof reason === "object" && "message" in reason) {
    return String((reason as { message: unknown }).message);
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return "";
  }
}

function matchesPattern(message: string, patterns: string[]) {
  const normalized = message.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function shouldAutoReload() {
  try {
    const lastReload = Number(window.sessionStorage.getItem(AUTO_RELOAD_KEY) ?? "0");
    return Number.isNaN(lastReload) || Date.now() - lastReload > AUTO_RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markAutoReload() {
  try {
    window.sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in hardened browser modes.
  }
}

export function ClientRuntimeGuard() {
  const [recoveryMessage, setRecoveryMessage] = useState("");

  useEffect(() => {
    const recover = (reason: unknown) => {
      const message = getReasonText(reason);

      if (!matchesPattern(message, RECOVERABLE_PATTERNS)) {
        return;
      }

      if (matchesPattern(message, STALE_ASSET_PATTERNS) && shouldAutoReload()) {
        markAutoReload();
        window.location.reload();
        return;
      }

      setRecoveryMessage(
        "This page was restored with stale browser data. Reload once and it should open normally."
      );
    };

    const handleError = (event: ErrorEvent) => {
      recover(event.error ?? event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recover(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (!recoveryMessage) {
    return null;
  }

  return (
    <div className="client-recovery-overlay" role="alert" aria-live="assertive">
      <div className="page-transition-panel client-recovery-card">
        <div className="page-transition-badge">Page Recovery</div>
        <div className="page-transition-copy">
          <strong>Loading page again</strong>
          <span>{recoveryMessage}</span>
        </div>
        <div className="recovery-action-row">
          <button type="button" className="recovery-button recovery-button-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="recovery-button recovery-button-secondary" href="/">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
