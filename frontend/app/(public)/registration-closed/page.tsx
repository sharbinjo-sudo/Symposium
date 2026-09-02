import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/config/site";

function formatDeadline(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Friday, September 11, 2026, 12:00 AM";
  }
}

function formatEventDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Friday, September 11, 2026";
  }
}

export default function RegistrationClosedPage() {
  const eventDateFormatted = formatEventDate(siteConfig.eventDate);
  const deadlineFormatted = formatDeadline(siteConfig.registrationDeadline);

  return (
    <div className="section page-shell-block registration-closed-page">
      <div className="container">
        <Reveal className="registration-closed-content" y={20} scale={0.98}>
          <GlassPanel className="registration-closed-card" tone="strong">
            <div className="registration-closed-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="30"
                  stroke="rgba(143, 29, 44, 0.24)"
                  strokeWidth="2"
                  fill="rgba(255, 255, 255, 0.6)"
                />
                <path
                  d="M32 18V34"
                  stroke="var(--ocean)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="32" cy="42" r="2.5" fill="var(--ocean)" />
              </svg>
            </div>
            <h1 className="registration-closed-title">
              Online Registration Has Ended
            </h1>
            <p className="registration-closed-message">
              Online registration has ended. Spot registrations will be accepted
              at the venue on the day of the event, prior to the commencement of
              activities.
            </p>
            <div className="registration-closed-details">
              <div className="registration-closed-detail">
                <span className="registration-closed-label">Event Date</span>
                <strong>{eventDateFormatted}</strong>
              </div>
              <div className="registration-closed-detail">
                <span className="registration-closed-label">Venue</span>
                <strong>{siteConfig.venue}</strong>
              </div>
              <div className="registration-closed-detail">
                <span className="registration-closed-label">Deadline Was</span>
                <strong>{deadlineFormatted}</strong>
              </div>
            </div>
          </GlassPanel>
        </Reveal>
      </div>
    </div>
  );
}
