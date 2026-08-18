import { EventCard } from "@/components/events/EventCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
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
            copy="Paper Presentation, Code Busters, Web Craft, and Visualytics are open for solo or team participation with a Rs. 250 per participant registration fee."
          />
        </div>
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
