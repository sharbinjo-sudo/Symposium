import { EventCard } from "@/components/events/EventCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { getEvents } from "@/lib/api";

export default async function TechnicalEventsPage() {
  const events = await getEvents();

  return (
    <div className="section page-shell-block technical-events-page">
      <div className="container">
        <div className="technical-events-head">
          <AnimatedHeading
            eyebrow="Technical Events"
            title="Technical events built for makers"
            copy="A national-level technical symposium featuring technical events for solo or team participation."
          />
        </div>
        <Reveal className="technical-note-reveal" delay={0.06} y={20} scale={0.98}>
          <GlassPanel className="technical-note-card" tone="strong">
            <p className="card-copy technical-note-copy">
              <strong>Note:</strong>
              <span>
                To attend the symposium, registration for at least one primary technical event is mandatory. If you
                have free time during the event, you may also attend other technical or non-technical events.
              </span>
            </p>
          </GlassPanel>
        </Reveal>
        <div className="event-grid">
          {events.map((event) => (
            <Reveal key={event.code} delay={event.order * 0.06}>
              <EventCard event={event} showImportantNotes={false} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
