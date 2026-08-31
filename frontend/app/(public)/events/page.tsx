import { EventCard } from "@/components/events/EventCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/config/site";

export default function EventsPage() {
  const technicalEvents = siteConfig.technicalEvents;
  const nonTechnicalEvents = siteConfig.nonTechnicalEvents;

  return (
    <div className="section page-shell-block events-page">
      <div className="container">
        <Reveal className="events-head-reveal" delay={0.04} y={22}>
          <AnimatedHeading
            eyebrow="All Events"
            title="Explore every event in one place"
            copy="Browse the full list of technical and non-technical events, review rules, and plan your participation."
          />
        </Reveal>

        <Reveal className="events-note-reveal" delay={0.06} y={20} scale={0.98}>
          <GlassPanel className="events-note-card" tone="strong">
            <p className="card-copy events-note-copy">
              <strong>Note:</strong>
              <span>
                To attend the symposium, registration for at least one primary technical event is mandatory.
                Non-technical events can also be selected during online registration.
              </span>
            </p>
          </GlassPanel>
        </Reveal>

        <Reveal className="events-section-reveal" delay={0.08} y={20}>
          <div className="events-section-head">
            <div className="events-section-header-row">
              <div className="events-section-badge events-section-badge-technical">
                <span className="events-section-badge-icon">TE</span>
                <span>{technicalEvents.length} Events</span>
              </div>
            </div>
            <h2 className="events-section-title">Technical Events</h2>
            <p className="events-section-copy">
              Individually registered events covering paper presentation, coding, web development, and data visualization.
            </p>
          </div>
        </Reveal>

        <div className="events-tech-grid">
          {technicalEvents.map((event) => (
            <Reveal key={event.code} delay={event.order * 0.06}>
              <EventCard event={event} showRegisterButton={false} showImportantNotes={false} />
            </Reveal>
          ))}
        </div>

        <Reveal className="events-section-reveal" delay={0.1} y={20}>
          <div className="events-section-head events-section-head-non-tech">
            <div className="events-section-header-row">
              <div className="events-section-badge events-section-badge-nontechnical">
                <span className="events-section-badge-icon">NT</span>
                <span>{nonTechnicalEvents.length} Events</span>
              </div>
            </div>
            <h2 className="events-section-title">Non-Technical Events</h2>
            <p className="events-section-copy">
              Stage challenges for quick minds, including expression, mystery, visual puzzles, and storytelling.
            </p>
          </div>
        </Reveal>

        <div className="events-tech-grid">
          {nonTechnicalEvents.map((event) => (
            <Reveal key={event.code} delay={event.order * 0.06}>
              <EventCard event={event} showRegisterButton={false} showImportantNotes={false} showTags={false} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
