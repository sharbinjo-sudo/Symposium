"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ApiError, adminLogin } from "@/lib/api";
import { navigateWithLoading } from "@/lib/navigation-transition";

const adminEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  function validateFields() {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email address is required.";
    } else if (!adminEmailPattern.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!validateFields()) {
      return;
    }

    setLoading(true);

    try {
      const result = await adminLogin(email.trim(), password);
      if (!result.ok) {
        setError("Email or password is incorrect.");
        return;
      }

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore permission prompt failures and continue to the dashboard.
        }
      }

      navigateWithLoading(router, "/admin/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
        return;
      }

      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-shell">
      <div className="container admin-login-layout">
        <div className="admin-login-copy">
          <div className="admin-login-copy-content">
            <div className="section-eyebrow">Admin Auth</div>
            <h2>Organizer dashboard access</h2>
            <p className="card-copy">
              Sign in to review registrations, verify payments, and manage symposium operations.
            </p>
          </div>
        </div>
        <form className="admin-login-card" onSubmit={handleSubmit}>
          <GlassPanel className="admin-login-panel">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                placeholder="organizer@example.edu"
                aria-invalid={fieldErrors.email ? "true" : "false"}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
              />
              {fieldErrors.email ? <div className="error">{fieldErrors.email}</div> : null}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                placeholder="Enter your admin password"
                aria-invalid={fieldErrors.password ? "true" : "false"}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
              />
              {fieldErrors.password ? <div className="error">{fieldErrors.password}</div> : null}
            </div>
            {error ? <div className="error">{error}</div> : null}
            <div className="step-actions">
              <Button type="submit" variant="primary" disabled={loading} magnetic>
                {loading ? "Signing in..." : "Open dashboard"}
              </Button>
            </div>
          </GlassPanel>
        </form>
      </div>
    </div>
  );
}

