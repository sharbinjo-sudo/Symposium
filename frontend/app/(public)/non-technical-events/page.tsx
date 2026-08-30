import { EventCard } from "@/components/events/EventCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/config/site";

export default function NonTechnicalEventsPage() {
  return (
    <div className="section page-shell-block technical-events-page non-technical-events-page">
      <div className="container">
        <div className="technical-events-head">
          <AnimatedHeading
            eyebrow="Non-Technical Events"
            title="Stage challenges for quick minds"
            copy="Expression, mystery, visual puzzles, and storytelling challenges designed for creativity, communication, and presence of mind."
          />
        </div>
        <Reveal className="non-tech-note-reveal" delay={0.06} y={20} scale={0.98}>
          <GlassPanel className="non-tech-note-card" tone="strong">
            <p className="card-copy non-tech-note-copy">
              <strong>Note:</strong>
              <span>Non-technical events will be fully handled offline.</span>
            </p>
          </GlassPanel>
        </Reveal>
        <div className="event-grid non-tech-event-grid">
          {siteConfig.nonTechnicalEvents.map((event) => (
            <Reveal key={event.code} delay={event.order * 0.06}>
              <EventCard
                event={event}
                showRegister={false}
                showImportantNotes={false}
                showTags={false}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
