import { EventCard } from "@/components/events/EventCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Reveal } from "@/components/ui/Reveal";
import { getEvents } from "@/lib/api";

export default async function TechnicalEventsPage() {
  const events = await getEvents();

  return (
    <div className="section page-shell-block">
      <div className="container">
        <AnimatedHeading
          eyebrow="Technical Events"
          title="Four event worlds, one clear registration system"
          copy="Cards stay readable without motion, but reward interaction with glass depth, subtle tilt, and expandable rules."
        />
        <div className="event-grid">
          {events.map((event) => (
            <Reveal key={event.code} delay={event.order * 0.06}>
              <EventCard event={event} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
