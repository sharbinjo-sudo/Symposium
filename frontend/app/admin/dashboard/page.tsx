"use client"

import { useDeferredValue, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { StatusChip } from "@/components/ui/StatusChip"
import {
  adminLogout,
  ApiError,
  createAdminRegistration,
  deleteAdminRegistration,
  downloadAdminRegistrationsCsv,
  getAdminRegistrations,
  getAdminSummary,
  resendAdminRegistrationEmail,
  updateAdminRegistration
} from "@/lib/api"
import { siteConfig } from "@/lib/config/site"
import { formatFoodPreference } from "@/lib/format"
import type {
  AdminRegistrationCreatePayload,
  AdminRegistrationFilters,
  AdminRegistrationRow,
  DashboardSummary,
  EventConfig,
  ParticipantInput
} from "@/lib/types"
import { participantSchema } from "@/lib/validation/registration"
import { navigateWithLoading } from "@/lib/navigation-transition"

type ChipTone = "pending" | "verified" | "rejected" | "clarify" | "neutral"

const emptySummary: DashboardSummary = {
  totalRegistrations: 0,
  pendingPayments: 0,
  verifiedPayments: 0,
  latestRegistration: null
}

const paymentOptions = [
  { value: "pending_verification", label: "Pending verification" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "needs_clarification", label: "Needs clarification" }
]

const providerOptions = [
  { value: "manual", label: "Manual" }
]

const yearOptions = [
  { value: "1", label: "1st year" },
  { value: "2", label: "2nd year" },
  { value: "3", label: "3rd year" },
  { value: "4", label: "4th year" }
]

const foodPreferenceOptions = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-Veg" }
]

function formatAdminDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

function formatStatusLabel(value: string | undefined) {
  return (value ?? "pending")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function paymentTone(status: string): ChipTone {
  if (status === "verified") {
    return "verified"
  }
  if (status === "rejected") {
    return "rejected"
  }
  if (status === "needs_clarification") {
    return "clarify"
  }
  if (status === "pending_verification") {
    return "pending"
  }
  return "neutral"
}

function emailTone(status: string): ChipTone {
  if (status === "sent") {
    return "verified"
  }
  if (status === "failed") {
    return "rejected"
  }
  if (status === "pending") {
    return "pending"
  }
  return "neutral"
}

function registrationTone(status: string): ChipTone {
  if (status === "submitted") {
    return "verified"
  }
  if (status === "cancelled") {
    return "rejected"
  }
  return "neutral"
}

function getReadableAdminError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (!(error instanceof Error)) {
    return fallbackMessage
  }

  const message = error.message.trim()
  if (!message || message === "Failed to fetch" || /network/i.test(message)) {
    return "Unable to connect right now. Please check the internet connection and try again."
  }

  return message
}

function isAdminAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

function emptyParticipant(isTeamLeader: boolean): ParticipantInput {
  return {
    fullName: "",
    collegeName: "",
    mobileNumber: "",
    email: "",
    department: "",
    yearOfStudy: "",
    foodPreference: "",
    isTeamLeader
  }
}

function todayDateValue() {
  return new Date().toLocaleDateString("en-CA")
}

function syncParticipantList(current: ParticipantInput[], nextSize: number) {
  return Array.from({ length: nextSize }, (_, index) => current[index] ?? emptyParticipant(index === 0)).map(
    (participant, index) => ({
      ...participant,
      isTeamLeader: index === 0
    })
  )
}

function mapCreateFieldErrors(fieldErrors: Record<string, string>) {
  const nextErrors: Record<string, string> = {}

  Object.entries(fieldErrors).forEach(([key, value]) => {
    if (key.startsWith("participants.")) {
      const [, index, field] = key.split(".")
      nextErrors[`participant-${index}-${field}`] = value
      return
    }

    nextErrors[key] = value
  })

  return nextErrors
}

async function fetchDashboardData(filters: AdminRegistrationFilters) {
  const [summary, registrations] = await Promise.all([getAdminSummary(), getAdminRegistrations(filters)])
  return { summary, registrations }
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const defaultEvent = siteConfig.technicalEvents[0]
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [registrations, setRegistrations] = useState<AdminRegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [eventFilter, setEventFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [draftPaymentStatus, setDraftPaymentStatus] = useState("pending_verification")
  const [draftNote, setDraftNote] = useState("")

  const [actionMessage, setActionMessage] = useState("")
  const [actionError, setActionError] = useState("")
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [createEventCode, setCreateEventCode] = useState(defaultEvent?.code ?? "")
  const [createTeamSize, setCreateTeamSize] = useState(defaultEvent?.minTeamSize ?? 1)
  const [createTeamName, setCreateTeamName] = useState("")
  const [createTransactionId, setCreateTransactionId] = useState("")
  const [createPaymentProvider, setCreatePaymentProvider] = useState("manual")
  const [createPaymentStatus, setCreatePaymentStatus] = useState("verified")
  const [createPaymentDate, setCreatePaymentDate] = useState(todayDateValue())

  const [createSendEmail, setCreateSendEmail] = useState(true)
  const [createAdminNote, setCreateAdminNote] = useState("")
  const [createParticipants, setCreateParticipants] = useState<ParticipantInput[]>(() =>
    Array.from({ length: defaultEvent?.minTeamSize ?? 1 }, (_, index) => emptyParticipant(index === 0))
  )
  const authRedirectingRef = useRef(false)
  const latestRegistrationCodeRef = useRef<string | null>(null)
  const initialNotificationSeededRef = useRef(false)

  function getCurrentFilters(): AdminRegistrationFilters {
    return {
      search: deferredSearch,
      eventCode: eventFilter,
      paymentStatus: paymentFilter
    }
  }

  const selectedRegistration = registrations.find((registration) => registration.registrationCode === selectedCode) ?? null
  const createEvent =
    siteConfig.technicalEvents.find((event) => event.code === createEventCode) ?? siteConfig.technicalEvents[0]

  function redirectToAdminLogin() {
    if (authRedirectingRef.current) {
      return
    }

    authRedirectingRef.current = true
    setLoading(false)
    setSaving(false)
    setResending(false)
    setExporting(false)
    setDeleting(false)
    setCreating(false)
    navigateWithLoading(router, "/aidsadmin?next=%2Fadmin%2Fdashboard", "replace")
  }

  useEffect(() => {
    if (!selectedRegistration) {
      setDraftPaymentStatus("pending_verification")
      setDraftNote("")
      return
    }

    setDraftPaymentStatus(selectedRegistration.paymentStatus)
    setDraftNote(selectedRegistration.adminNote ?? "")
    setActionError("")
  }, [selectedRegistration])

  useEffect(() => {
    let active = true
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const loadDashboard = async (showLoading: boolean) => {
      const activeFilters = getCurrentFilters()

      if (showLoading) {
        setLoading(true)
      }
      setError("")

      try {
        const nextData = await fetchDashboardData(activeFilters)

        if (!active) {
          return
        }

        setSummary(nextData.summary)
        setRegistrations(nextData.registrations)
        setSelectedCode((current) =>
          current && nextData.registrations.some((registration) => registration.registrationCode === current)
            ? current
            : null
        )

        const latestCode = nextData.summary.latestRegistration?.registrationCode ?? null
        if (!initialNotificationSeededRef.current) {
          latestRegistrationCodeRef.current = latestCode
          initialNotificationSeededRef.current = true
        } else if (
          latestCode &&
          latestCode !== latestRegistrationCodeRef.current &&
          nextData.summary.latestRegistration &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const latestRegistration = nextData.summary.latestRegistration
          new Notification("New registration received", {
            body: `${latestRegistration.participantName} registered for ${latestRegistration.eventName}.`
          })
          latestRegistrationCodeRef.current = latestCode
        } else {
          latestRegistrationCodeRef.current = latestCode
        }
      } catch (loadError) {
        if (!active) {
          return
        }

        if (isAdminAuthError(loadError)) {
          redirectToAdminLogin()
          return
        }

        setError("We couldn't load the dashboard right now. Please refresh and try again.")
      } finally {
        if (active && showLoading) {
          setLoading(false)
        }
      }
    }

    void loadDashboard(true)
    pollTimer = setInterval(() => {
      void loadDashboard(false)
    }, 30000)

    return () => {
      active = false
      if (pollTimer) {
        clearInterval(pollTimer)
      }
    }
  }, [deferredSearch, eventFilter, paymentFilter, router])

  function resetCreateForm(nextEvent: EventConfig = defaultEvent) {
    setCreateErrors({})
    setCreateEventCode(nextEvent.code)
    setCreateTeamSize(nextEvent.minTeamSize)
    setCreateTeamName("")
    setCreateTransactionId("")
    setCreatePaymentProvider("manual")
    setCreatePaymentStatus("verified")
    setCreatePaymentDate(todayDateValue())
    setCreateSendEmail(true)
    setCreateAdminNote("")
    setCreateParticipants(Array.from({ length: nextEvent.minTeamSize }, (_, index) => emptyParticipant(index === 0)))
  }

  async function refreshDashboard(showLoading = false) {
    const activeFilters = getCurrentFilters()

    if (showLoading) {
      setLoading(true)
    }
    setError("")

    try {
      const nextData = await fetchDashboardData(activeFilters)
      setSummary(nextData.summary)
      setRegistrations(nextData.registrations)
      setSelectedCode((current) =>
        current && nextData.registrations.some((registration) => registration.registrationCode === current)
          ? current
          : null
      )
    } catch (refreshError) {
      if (isAdminAuthError(refreshError)) {
        redirectToAdminLogin()
        return
      }

      setError(getReadableAdminError(refreshError, "We couldn't refresh the dashboard right now."))
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  function handleCreateEventChange(nextEventCode: string) {
    const nextEvent = siteConfig.technicalEvents.find((event) => event.code === nextEventCode)
    if (!nextEvent) {
      return
    }

    setCreateEventCode(nextEvent.code)
    setCreateTeamSize(nextEvent.minTeamSize)
    setCreateParticipants(Array.from({ length: nextEvent.minTeamSize }, (_, index) => emptyParticipant(index === 0)))
    setCreateErrors((current) => {
      const next = { ...current }
      delete next.eventCode
      delete next.teamName
      return next
    })
  }

  function handleCreateTeamSizeChange(nextSize: number) {
    setCreateTeamSize(nextSize)
    setCreateParticipants((current) => syncParticipantList(current, nextSize))
  }

  function handleCreateParticipantChange(index: number, field: keyof ParticipantInput, value: string | boolean) {
    setCreateParticipants((current) =>
      current.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, [field]: value } : participant
      )
    )
    setCreateErrors((current) => ({ ...current, [`participant-${index}-${field}`]: "" }))
  }

  function validateCreateForm() {
    const nextErrors: Record<string, string> = {}

    if (!createEventCode) {
      nextErrors.eventCode = "Choose an event."
    }

    if (createEvent.maxTeamSize > 1 && !createTeamName.trim()) {
      nextErrors.teamName = "Team name is required for this event."
    }

    if (!createTransactionId.trim()) {
      nextErrors.transactionId = "Payment reference is required."
    }

    if (!createPaymentDate) {
      nextErrors.paymentDate = "Payment date is required."
    }

    createParticipants.forEach((participant, index) => {
      const result = participantSchema.safeParse(participant)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const fieldName = issue.path[0]
          if (typeof fieldName === "string") {
            nextErrors[`participant-${index}-${fieldName}`] = issue.message
          }
        })
      }
    })

    setCreateErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleCreateRegistration() {
    if (!validateCreateForm()) {
      return
    }

    setCreating(true)
    setActionMessage("")
    setActionError("")

    const payload: AdminRegistrationCreatePayload = {
      eventCode: createEventCode,
      teamName: createEvent.maxTeamSize > 1 ? createTeamName.trim() : "",
      teamSize: createTeamSize,
      transactionId: createTransactionId.trim(),
      paymentProvider: createPaymentProvider,
      paymentStatus: createPaymentStatus,
      paymentDate: createPaymentDate,
      adminNote: createAdminNote.trim(),
      sendEmail: createSendEmail,
      participants: createParticipants
    }

    try {
      const created = await createAdminRegistration(payload)
      await refreshDashboard()
      setSelectedCode(created.registrationCode)
      setIsCreateMode(false)
      resetCreateForm()
      setActionMessage("New registration was created successfully.")
    } catch (createError) {
      if (isAdminAuthError(createError)) {
        redirectToAdminLogin()
        return
      }

      if (createError instanceof ApiError) {
        setCreateErrors(mapCreateFieldErrors(createError.fieldErrors))
      }
      setActionError(getReadableAdminError(createError, "We couldn't create the registration right now."))
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveChanges() {
    if (!selectedRegistration) {
      return
    }

    setSaving(true)
    setActionMessage("")
    setActionError("")

    try {
      await updateAdminRegistration(selectedRegistration.registrationCode, {
        paymentStatus: draftPaymentStatus,
        adminNote: draftNote.trim()
      })
      await refreshDashboard()
      setActionMessage("Registration details were updated successfully.")
    } catch (saveError) {
      if (isAdminAuthError(saveError)) {
        redirectToAdminLogin()
        return
      }

      setActionError(getReadableAdminError(saveError, "We couldn't save those changes right now."))
    } finally {
      setSaving(false)
    }
  }

  async function handleResendEmail() {
    if (!selectedRegistration) {
      return
    }

    setResending(true)
    setActionMessage("")
    setActionError("")

    try {
      const result = await resendAdminRegistrationEmail(selectedRegistration.registrationCode)
      await refreshDashboard()
      setActionMessage(
        result.ok ? "Confirmation email was sent to the participant." : "The participant email could not be sent right now."
      )
    } catch (resendError) {
      if (isAdminAuthError(resendError)) {
        redirectToAdminLogin()
        return
      }

      setActionError(getReadableAdminError(resendError, "We couldn't resend the participant email right now."))
    } finally {
      setResending(false)
    }
  }

  async function handleDeleteSelected() {
    if (!selectedRegistration) {
      return
    }

    const shouldDelete = window.confirm(
      `Delete registration ${selectedRegistration.registrationCode}? This cannot be undone.`
    )
    if (!shouldDelete) {
      return
    }

    setDeleting(true)
    setActionMessage("")
    setActionError("")

    try {
      await deleteAdminRegistration(selectedRegistration.registrationCode)
      await refreshDashboard()
      setActionMessage("Registration was deleted successfully.")
    } catch (deleteError) {
      if (isAdminAuthError(deleteError)) {
        redirectToAdminLogin()
        return
      }

      setActionError(getReadableAdminError(deleteError, "We couldn't delete that registration right now."))
    } finally {
      setDeleting(false)
    }
  }

  async function handleExportCsv() {
    const activeFilters = getCurrentFilters()

    setExporting(true)
    setError("")

    try {
      const objectUrl = await downloadAdminRegistrationsCsv(activeFilters)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = "cyberpunk26-registrations.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (exportError) {
      if (isAdminAuthError(exportError)) {
        redirectToAdminLogin()
        return
      }

      setError(getReadableAdminError(exportError, "We couldn't export the registrations right now."))
    } finally {
      setExporting(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    setError("")

    try {
      await adminLogout()
      navigateWithLoading(router, "/aidsadmin", "replace")
    } catch (logoutError) {
      if (isAdminAuthError(logoutError)) {
        navigateWithLoading(router, "/aidsadmin", "replace")
        return
      }

      setError(getReadableAdminError(logoutError, "We couldn't sign you out right now."))
      setLoggingOut(false)
    }
  }

  function renderSelectedRegistrationCard(registration: AdminRegistrationRow) {
    return (
      <>
        <div className="admin-detail-head">
          <div>
            <div className="section-eyebrow">Registration Detail</div>
            <h3>{registration.registrationCode}</h3>
          </div>
          <div className="admin-detail-head-actions">
            <StatusChip tone={registrationTone(registration.registrationStatus)}>
              {formatStatusLabel(registration.registrationStatus)}
            </StatusChip>
            <Button type="button" variant="secondary" onClick={() => setSelectedCode(null)}>
              Close
            </Button>
          </div>
        </div>

        <div className="admin-detail-grid">
          <div className="admin-detail-item">
            <span>Event</span>
            <strong>{registration.eventName}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Team</span>
            <strong>{registration.teamName || "Solo entry"}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Lead email</span>
            <strong>{registration.leadParticipantEmail || "Not provided"}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Transaction ID</span>
            <strong>{registration.transactionId}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Amount</span>
            <strong>Rs. {registration.amountPaid}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Payment date</span>
            <strong>{formatAdminDate(registration.paymentDate)}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Gateway</span>
            <strong>{formatStatusLabel(registration.paymentProvider)}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Gateway check</span>
            <strong>{registration.gatewayVerified ? "Verified by Cashfree" : "Manual admin record"}</strong>
          </div>
          <div className="admin-detail-item">
            <span>Cashfree order</span>
            <strong>{registration.paymentOrderId || "Not stored"}</strong>
          </div>
        </div>

        <div className="admin-detail-stack">
          <div className="summary-row">
            <span>Participants</span>
            <strong>{registration.participantNames.join(", ")}</strong>
          </div>
          <div className="summary-row">
            <span>Food preference</span>
            <strong>{(registration.participantFoodPreferences ?? []).map(formatFoodPreference).join(", ")}</strong>
          </div>
          <div className="summary-row">
            <span>Team size</span>
            <strong>{registration.teamSize}</strong>
          </div>
          <div className="summary-row">
            <span>Email delivery</span>
            <strong>{formatStatusLabel(registration.emailStatus)}</strong>
          </div>
        </div>

        <div className="field">
          <label htmlFor="payment-status">Payment status</label>
          <select
            id="payment-status"
            value={draftPaymentStatus}
            onChange={(event) => setDraftPaymentStatus(event.target.value)}
          >
            {paymentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>                  <div className="field">
                    <label htmlFor="admin-note">Admin note</label>
          <textarea
            id="admin-note"
            rows={5}
            value={draftNote}
            placeholder="Add an internal note for payment review, clarification, or event-day handling."
            onChange={(event) => setDraftNote(event.target.value)}
          />
        </div>

        {actionError ? <div className="error">{actionError}</div> : null}
        {actionMessage ? <div className="helper admin-action-message">{actionMessage}</div> : null}

        <div className="admin-detail-actions">
          <Button type="button" variant="primary" onClick={() => void handleSaveChanges()} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleResendEmail()} disabled={resending}>
            {resending ? "Sending..." : "Resend email"}
          </Button>
          <Button type="button" variant="accent" onClick={() => void handleDeleteSelected()} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete registration"}
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="admin-shell">
      <div className="container admin-dashboard-layout">
        <aside className="admin-sidebar">
          <GlassPanel className="admin-sidebar-panel" tone="strong">
            <div className="section-eyebrow">Admin Dashboard</div>
            <h2>Verification and operations</h2>
            <p className="card-copy">
              Manage Cashfree-backed registrations, create organizer-side entries, export records, and keep review work
              fast and clean.
            </p>
            <div className="admin-sidebar-links">
              <span>Registrations</span>
              <span>Payments</span>
              <span>Exports</span>
            </div>
            <div className="admin-sidebar-actions">
              <Button type="button" variant="primary" onClick={() => setIsCreateMode(true)}>
                Create registration
              </Button>
              <Button type="button" variant="secondary" onClick={() => void refreshDashboard(true)}>
                Refresh data
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleLogout()} disabled={loggingOut}>
                {loggingOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </GlassPanel>
        </aside>

        <div className="admin-main">
          {summary.latestRegistration ? (
            <GlassPanel className="dashboard-card admin-notification-card" tone="strong">
              <div className="section-eyebrow">Latest Submission</div>
              <h3>Newest registration in the system</h3>
              <p className="card-copy">
                <strong>{summary.latestRegistration.participantName}</strong> registered for{" "}
                <strong>{summary.latestRegistration.eventName}</strong>. Use the workspace below to review, verify, or
                follow up.
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

          </section>

          <section className="admin-section admin-workspace">
            <GlassPanel className="dashboard-card admin-detail-card" tone="strong">
                {isCreateMode ? (
                <>
                  <div className="admin-detail-head">
                    <div>
                      <div className="section-eyebrow">Create Registration</div>
                      <h3>Add a new organizer-side record</h3>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsCreateMode(false)
                        resetCreateForm()
                        setActionError("")
                      }}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="admin-create-grid">
                    <div className="field">
                      <label htmlFor="create-event">Event</label>
                      <select id="create-event" value={createEventCode} onChange={(event) => handleCreateEventChange(event.target.value)}>
                        {siteConfig.technicalEvents.map((event) => (
                          <option key={event.code} value={event.code}>
                            {event.name}
                          </option>
                        ))}
                      </select>
                      {createErrors.eventCode ? <div className="error">{createErrors.eventCode}</div> : null}
                    </div>

                    <div className="field">
                      <label htmlFor="create-team-size">Team size</label>
                      <select
                        id="create-team-size"
                        value={createTeamSize}
                        onChange={(event) => handleCreateTeamSizeChange(Number(event.target.value))}
                      >
                        {Array.from(
                          { length: createEvent.maxTeamSize - createEvent.minTeamSize + 1 },
                          (_, index) => createEvent.minTeamSize + index
                        ).map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="create-transaction">Payment reference</label>
                      <input
                        id="create-transaction"
                        value={createTransactionId}
                        onChange={(event) => {
                          setCreateTransactionId(event.target.value)
                          setCreateErrors((current) => ({ ...current, transactionId: "" }))
                        }}
                      />
                      {createErrors.transactionId ? <div className="error">{createErrors.transactionId}</div> : null}
                    </div>

                    <div className="field">
                      <label htmlFor="create-payment-date">Payment date</label>
                      <input
                        id="create-payment-date"
                        type="date"
                        value={createPaymentDate}
                        onChange={(event) => {
                          setCreatePaymentDate(event.target.value)
                          setCreateErrors((current) => ({ ...current, paymentDate: "" }))
                        }}
                      />
                      {createErrors.paymentDate ? <div className="error">{createErrors.paymentDate}</div> : null}
                    </div>

                    <div className="field">
                      <label htmlFor="create-provider">Payment provider</label>
                      <select
                        id="create-provider"
                        value={createPaymentProvider}
                        onChange={(event) => setCreatePaymentProvider(event.target.value)}
                        disabled
                      >
                        {providerOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="helper">Organizer-created records are marked manual. Cashfree records come only from checkout.</div>
                    </div>

                    <div className="field">
                      <label htmlFor="create-payment-status">Payment status</label>
                      <select
                        id="create-payment-status"
                        value={createPaymentStatus}
                        onChange={(event) => setCreatePaymentStatus(event.target.value)}
                      >
                        {paymentOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field admin-create-grid-span">
                      <label htmlFor="create-team-name">Team name</label>
                      <input
                        id="create-team-name"
                        value={createTeamName}
                        onChange={(event) => {
                          setCreateTeamName(event.target.value)
                          setCreateErrors((current) => ({ ...current, teamName: "" }))
                        }}
                        placeholder={createEvent.maxTeamSize > 1 ? "Required for team events" : "Optional for solo entries"}
                      />
                      {createErrors.teamName ? <div className="error">{createErrors.teamName}</div> : null}
                    </div>
                  </div>

                  <div className="admin-create-checkboxes">
                    <label className="consent-row admin-checkbox-row">
                      <input type="checkbox" checked={createSendEmail} onChange={(event) => setCreateSendEmail(event.target.checked)} />
                      <span>Send confirmation email to participant</span>
                    </label>
                  </div>

                  <div className="field">
                    <label htmlFor="create-admin-note">Admin note</label>
                    <textarea
                      id="create-admin-note"
                      rows={4}
                      value={createAdminNote}
                      onChange={(event) => setCreateAdminNote(event.target.value)}
                      placeholder="Optional note for internal follow-up."
                    />
                  </div>

                  <div className="admin-create-participants">
                    {createParticipants.map((participant, index) => (
                      <div key={`create-participant-${index}`} className="participant-card admin-create-participant-card">
                        <div className="participant-labels">
                          <span>{index === 0 ? "Team Leader" : `Participant ${index + 1}`}</span>
                          <span>{index === 0 ? "Primary contact" : "Member details"}</span>
                        </div>
                        <div className="form-grid two">
                          <div className="field">
                            <label htmlFor={`create-full-name-${index}`}>Full name</label>
                            <input
                              id={`create-full-name-${index}`}
                              value={participant.fullName}
                              onChange={(event) => handleCreateParticipantChange(index, "fullName", event.target.value)}
                            />
                            {createErrors[`participant-${index}-fullName`] ? (
                              <div className="error">{createErrors[`participant-${index}-fullName`]}</div>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`create-college-${index}`}>College name</label>
                            <input
                              id={`create-college-${index}`}
                              value={participant.collegeName}
                              onChange={(event) => handleCreateParticipantChange(index, "collegeName", event.target.value)}
                            />
                            {createErrors[`participant-${index}-collegeName`] ? (
                              <div className="error">{createErrors[`participant-${index}-collegeName`]}</div>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`create-mobile-${index}`}>Mobile number</label>
                            <input
                              id={`create-mobile-${index}`}
                              value={participant.mobileNumber}
                              placeholder="Example: +91 98XXX XX210"
                              onChange={(event) => handleCreateParticipantChange(index, "mobileNumber", event.target.value)}
                            />
                            {createErrors[`participant-${index}-mobileNumber`] ? (
                              <div className="error">{createErrors[`participant-${index}-mobileNumber`]}</div>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`create-email-${index}`}>Email address</label>
                            <input
                              id={`create-email-${index}`}
                              type="email"
                              value={participant.email}
                              onChange={(event) => handleCreateParticipantChange(index, "email", event.target.value)}
                            />
                            {createErrors[`participant-${index}-email`] ? (
                              <div className="error">{createErrors[`participant-${index}-email`]}</div>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`create-department-${index}`}>Department</label>
                            <input
                              id={`create-department-${index}`}
                              value={participant.department}
                              onChange={(event) => handleCreateParticipantChange(index, "department", event.target.value)}
                            />
                            {createErrors[`participant-${index}-department`] ? (
                              <div className="error">{createErrors[`participant-${index}-department`]}</div>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`create-year-${index}`}>Year of study</label>
                            <select
                              id={`create-year-${index}`}
                              value={participant.yearOfStudy}
                              onChange={(event) => handleCreateParticipantChange(index, "yearOfStudy", event.target.value)}
                            >
                              <option value="">Choose year</option>
                              {yearOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {createErrors[`participant-${index}-yearOfStudy`] ? (
                              <div className="error">{createErrors[`participant-${index}-yearOfStudy`]}</div>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`create-food-${index}`}>Food preference</label>
                            <select
                              id={`create-food-${index}`}
                              value={participant.foodPreference}
                              onChange={(event) => handleCreateParticipantChange(index, "foodPreference", event.target.value)}
                            >
                              <option value="">Choose food</option>
                              {foodPreferenceOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {createErrors[`participant-${index}-foodPreference`] ? (
                              <div className="error">{createErrors[`participant-${index}-foodPreference`]}</div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {actionError ? <div className="error">{actionError}</div> : null}

                  <div className="admin-detail-actions">
                    <Button type="button" variant="primary" onClick={() => void handleCreateRegistration()} disabled={creating}>
                      {creating ? "Creating..." : "Create registration"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        resetCreateForm()
                        setActionError("")
                      }}
                    >
                      Reset form
                    </Button>
                  </div>
                </>
              ) : selectedRegistration ? (
                <>
                  <div className="admin-detail-head">
                    <div>
                      <div className="section-eyebrow">Registration Detail</div>
                      <h3>{selectedRegistration!.registrationCode}</h3>
                    </div>
                    <div className="admin-detail-head-actions">
                      <StatusChip tone={registrationTone(selectedRegistration.registrationStatus)}>
                        {formatStatusLabel(selectedRegistration.registrationStatus)}
                      </StatusChip>
                      <Button type="button" variant="secondary" onClick={() => setSelectedCode(null)}>
                        Close
                      </Button>
                    </div>
                  </div>

                  <div className="admin-detail-grid">
                    <div className="admin-detail-item">
                      <span>Event</span>
                      <strong>{selectedRegistration.eventName}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Team</span>
                      <strong>{selectedRegistration.teamName || "Solo entry"}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Lead email</span>
                      <strong>{selectedRegistration.leadParticipantEmail || "Not provided"}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Transaction ID</span>
                      <strong>{selectedRegistration.transactionId}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Amount</span>
                      <strong>Rs. {selectedRegistration.amountPaid}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Payment date</span>
                      <strong>{formatAdminDate(selectedRegistration.paymentDate)}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Gateway</span>
                      <strong>{formatStatusLabel(selectedRegistration.paymentProvider)}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Gateway check</span>
                      <strong>{selectedRegistration.gatewayVerified ? "Verified by Cashfree" : "Manual admin record"}</strong>
                    </div>
                    <div className="admin-detail-item">
                      <span>Cashfree order</span>
                      <strong>{selectedRegistration.paymentOrderId || "Not stored"}</strong>
                    </div>
                  </div>

                  <div className="admin-detail-stack">
                      <div className="summary-row">
                        <span>Participants</span>
                        <strong>{selectedRegistration.participantNames.join(", ")}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Food preference</span>
                        <strong>{(selectedRegistration.participantFoodPreferences ?? []).map(formatFoodPreference).join(", ")}</strong>
                      </div>
                      <div className="summary-row">
                      <span>Team size</span>
                      <strong>{selectedRegistration.teamSize}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Email delivery</span>
                      <strong>{formatStatusLabel(selectedRegistration.emailStatus)}</strong>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="payment-status">Payment status</label>
                    <select
                      id="payment-status"
                      value={draftPaymentStatus}
                      onChange={(event) => setDraftPaymentStatus(event.target.value)}
                    >
                      {paymentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="admin-note">Admin note</label>
                    <textarea
                      id="admin-note"
                      rows={5}
                      value={draftNote}
                      placeholder="Add an internal note for payment review, clarification, or event-day handling."
                      onChange={(event) => setDraftNote(event.target.value)}
                    />
                  </div>

                  {actionError ? <div className="error">{actionError}</div> : null}
                  {actionMessage ? <div className="helper admin-action-message">{actionMessage}</div> : null}

                  <div className="admin-detail-actions">
                    <Button type="button" variant="primary" onClick={() => void handleSaveChanges()} disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void handleResendEmail()} disabled={resending}>
                      {resending ? "Sending..." : "Resend email"}
                    </Button>
                    <Button type="button" variant="accent" onClick={() => void handleDeleteSelected()} disabled={deleting}>
                      {deleting ? "Deleting..." : "Delete registration"}
                    </Button>
                  </div>
                </>
              ) : selectedRegistration ? (
                renderSelectedRegistrationCard(selectedRegistration as AdminRegistrationRow)
              ) : (
                <>
                  <div className="admin-detail-head">
                    <div>
                      <div className="section-eyebrow">Registration Workspace</div>
                      <h3>Choose a registration to view it</h3>
                    </div>
                    <Button type="button" variant="primary" onClick={() => setIsCreateMode(true)}>
                      Create registration
                    </Button>
                  </div>
                  <p className="card-copy">
                    Select a registration from the table below to open its full details, update payment status,
                    notes, and email actions.
                  </p>
                  {actionMessage ? <div className="helper admin-action-message">{actionMessage}</div> : null}
                </>
              )}
            </GlassPanel>

            <GlassPanel className="dashboard-card dashboard-table-card" tone="strong">
              <div className="table-toolbar">
                <input
                  value={search}
                  placeholder="Search code, team, participant, email, roll number, or transaction"
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
                  <option value="all">All payment states</option>
                  {paymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
                  <option value="all">All events</option>
                  {siteConfig.technicalEvents.map((event) => (
                    <option key={event.code} value={event.code}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <button className="admin-inline-button" type="button" onClick={() => void handleExportCsv()} disabled={exporting}>
                  {exporting ? "Exporting..." : "Export CSV"}
                </button>
              </div>

              <div className="table-meta">
                {loading
                  ? "Loading registration and payment records..."
                  : `${registrations.length} registration${registrations.length === 1 ? "" : "s"} match the current filters.`}
              </div>

              {error ? <div className="error">{error}</div> : null}

              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Registration</th>
                      <th>Lead participant</th>
                      <th>Event</th>
                      <th>Payment</th>
                      <th>Email</th>

                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7}>Loading registrations...</td>
                      </tr>
                    ) : registrations.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No registrations match the current filters.</td>
                      </tr>
                    ) : (
                      registrations.map((registration) => (
                        <tr
                          key={registration.registrationCode}
                          className={registration.registrationCode === selectedCode ? "is-selected" : ""}
                          onClick={() => {
                            setIsCreateMode(false)
                            setSelectedCode(registration.registrationCode)
                          }}
                        >
                          <td>
                            <strong>{registration.registrationCode}</strong>
                            <div className="table-subtext">{registration.teamName || "Solo entry"}</div>
                          </td>
                          <td>
                            <strong>{registration.leadParticipantName || "Participant"}</strong>
                            <div className="table-subtext">{registration.leadParticipantEmail || "No email"}</div>
                          </td>
                          <td>{registration.eventName}</td>
                          <td>
                            <StatusChip tone={paymentTone(registration.paymentStatus)}>
                              {formatStatusLabel(registration.paymentStatus)}
                            </StatusChip>
                            <div className="table-subtext">
                              {registration.gatewayVerified ? "Cashfree verified" : formatStatusLabel(registration.paymentProvider)}
                            </div>
                          </td>
                          <td>
                            <StatusChip tone={emailTone(registration.emailStatus)}>
                              {formatStatusLabel(registration.emailStatus)}
                            </StatusChip>
                          </td>

                          <td>{formatAdminDate(registration.createdAt)}</td>
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
  )
}

