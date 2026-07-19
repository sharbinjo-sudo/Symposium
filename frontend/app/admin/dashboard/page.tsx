"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { StatusChip } from "@/components/ui/StatusChip";
import { getAdminRegistrations, getAdminSummary } from "@/lib/api";
import { siteConfig } from "@/lib/config/site";
import type { AdminRegistrationRow, DashboardSummary } from "@/lib/types";

function paymentTone(status: string): "pending" | "verified" | "rejected" | "clarify" | "neutral" {
  if (status === "verified") {
    return "verified";
  }
  if (status === "rejected") {
    return "rejected";
  }
  if (status === "needs_clarification") {
    return "clarify";
  }
  if (status === "pending_verification") {
    return "pending";
  }
  return "neutral";
}

const emptySummary: DashboardSummary = {
  totalRegistrations: 0,
  pendingPayments: 0,
  verifiedPayments: 0,
  attendanceMarked: 0,
  latestRegistration: null
};

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [registrations, setRegistrations] = useState<AdminRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRegistrationCodeRef = useRef<string | null>(null);
  const initialNotificationSeededRef = useRef(false);

  useEffect(() => {
    let active = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const loadDashboard = async (showLoading: boolean) => {
      if (showLoading) {
        setLoading(true);
      }
      setError("");

      try {
        const [nextSummary, nextRegistrations] = await Promise.all([getAdminSummary(), getAdminRegistrations()]);

        if (!active) {
          return;
        }

        setSummary(nextSummary);
        setRegistrations(nextRegistrations);

        const latestCode = nextSummary.latestRegistration?.registrationCode ?? null;
        if (!initialNotificationSeededRef.current) {
          latestRegistrationCodeRef.current = latestCode;
          initialNotificationSeededRef.current = true;
        } else if (
          latestCode &&
          latestCode !== latestRegistrationCodeRef.current &&
          nextSummary.latestRegistration &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const latestRegistration = nextSummary.latestRegistration;
          new Notification("New registration received", {
            body: `${latestRegistration.participantName} registered for ${latestRegistration.eventName}.`
          });
          latestRegistrationCodeRef.current = latestCode;
        } else {
          latestRegistrationCodeRef.current = latestCode;
        }
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load the admin dashboard.";
        if (message.includes("401") || message.includes("403")) {
          router.replace("/admin/login");
          return;
        }

        setError("Unable to load live dashboard data right now.");
      } finally {
        if (active && showLoading) {
          setLoading(false);
        }
      }
    };

    void loadDashboard(true);
    pollTimer = setInterval(() => {
      void loadDashboard(false);
    }, 30000);

    return () => {
      active = false;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [router]);

  return (
    <div className="admin-shell">
      <div className="container admin-dashboard-layout">
        <aside className="admin-sidebar">
          <GlassPanel className="admin-sidebar-panel" tone="strong">
            <div className="section-eyebrow">Admin Dashboard</div>
            <h2>Verification and analytics</h2>
            <p className="card-copy">A quieter version of the Aurora theme focused on fast review, filters, and status work.</p>
            <div className="admin-sidebar-links">
              <span>Registrations</span>
              <span>Payments</span>
              <span>Attendance</span>
              <span>Exports</span>
            </div>
          </GlassPanel>
        </aside>

        <div className="admin-main">
          {summary.latestRegistration ? (
            <GlassPanel className="dashboard-card admin-notification-card" tone="strong">
              <div className="section-eyebrow">Web Notification</div>
              <h3>New registration received</h3>
              <p className="card-copy">
                <strong>{summary.latestRegistration.participantName}</strong> registered for{" "}
                <strong>{summary.latestRegistration.eventName}</strong>. This is the newest submission currently available in
                the admin dashboard.
              </p>
              <div className="admin-notification-grid">
                <div className="admin-notification-item">
                  <span>Code</span>
                  <strong>{summary.latestRegistration.registrationCode}</strong>
                </div>
                <div className="admin-notification-item">
                  <span>Team</span>
                  <strong>{summary.latestRegistration.teamName || "Solo entry"}</strong>
                </div>
                <div className="admin-notification-item">
                  <span>Email</span>
                  <strong>{summary.latestRegistration.participantEmail || "Not provided"}</strong>
                </div>
                <div className="admin-notification-item">
                  <span>Submitted</span>
                  <strong>{formatAdminDate(summary.latestRegistration.createdAt)}</strong>
                </div>
              </div>
            </GlassPanel>
          ) : null}

          <section className="summary-grid">
            <GlassPanel className="dashboard-card" tone="soft">
              <div className="metric-label">Total registrations</div>
              <strong className="metric-value">{summary.totalRegistrations}</strong>
            </GlassPanel>
            <GlassPanel className="dashboard-card" tone="soft">
              <div className="metric-label">Pending payments</div>
              <strong className="metric-value">{summary.pendingPayments}</strong>
            </GlassPanel>
            <GlassPanel className="dashboard-card" tone="soft">
              <div className="metric-label">Verified payments</div>
              <strong className="metric-value">{summary.verifiedPayments}</strong>
            </GlassPanel>
            <GlassPanel className="dashboard-card" tone="soft">
              <div className="metric-label">Attendance marked</div>
              <strong className="metric-value">{summary.attendanceMarked}</strong>
            </GlassPanel>
          </section>

          <section className="admin-section">
            <GlassPanel className="dashboard-card dashboard-table-card" tone="strong">
              <div className="table-toolbar">
                <input placeholder="Search team, code, email, or transaction" />
                <select defaultValue="all">
                  <option value="all">All payment states</option>
                  <option value="pending_verification">Pending verification</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="needs_clarification">Needs clarification</option>
                </select>
                <select defaultValue="all">
                  <option value="all">All events</option>
                  {siteConfig.technicalEvents.map((event) => (
                    <option key={event.code} value={event.code}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <button className="admin-inline-button" type="button">
                  Export CSV
                </button>
              </div>

              <div className="table-meta">
                {loading
                  ? "Loading live registration and payment records from the Django admin APIs."
                  : "Live registration and payment records are being read directly from the backend session."}
              </div>

              {error ? <div className="error">{error}</div> : null}

              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Registration</th>
                      <th>Event</th>
                      <th>Team</th>
                      <th>Payment</th>
                      <th>Email</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6}>Loading dashboard data...</td>
                      </tr>
                    ) : registrations.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No registrations found yet.</td>
                      </tr>
                    ) : (
                      registrations.map((registration) => (
                        <tr key={registration.registrationCode}>
                          <td>{registration.registrationCode}</td>
                          <td>{registration.eventName}</td>
                          <td>{registration.teamName || "Solo"}</td>
                          <td>
                            <StatusChip tone={paymentTone(registration.paymentStatus)}>
                              {registration.paymentStatus.replaceAll("_", " ")}
                            </StatusChip>
                          </td>
                          <td>{registration.emailStatus}</td>
                          <td>{registration.createdAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </section>
        </div>
      </div>
    </div>
  );
}
