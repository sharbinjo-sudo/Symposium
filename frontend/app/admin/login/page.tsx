"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { adminLogin } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await adminLogin(email, password);
      if (!result.ok) {
        setError("Invalid admin credentials.");
        return;
      }

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore permission prompt failures and continue to the dashboard.
        }
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Unable to reach the admin API right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-shell">
      <div className="container admin-login-layout">
        <GlassPanel className="admin-login-copy" tone="strong">
          <div className="admin-login-copy-content">
            <div className="section-eyebrow">Admin Auth</div>
            <h2>Organizer dashboard access</h2>
            <p className="card-copy">
              Sign in to review registrations, verify payments, and manage symposium operations.
            </p>
          </div>
        </GlassPanel>
        <form className="admin-login-card" onSubmit={handleSubmit}>
          <GlassPanel className="wizard-card admin-login-panel" tone="strong">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
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
