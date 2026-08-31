import { PrizeCard } from "@/components/events/PrizeCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { getEvents } from "@/lib/api";

export default async function PrizesPage() {
  const allEvents = await getEvents();
  const events = allEvents.filter((event) => event.track === "Technical");

  return (
    <div className="section page-shell-block prizes-page">
      <div className="container">
        <div className="prizes-page-head">
          <AnimatedHeading
            eyebrow="Rewards"
            title={["Prizes & Awards"]}
            copy="Cash prizes for top performers and certificates for all registered participants."
          />
        </div>
        <GlassPanel className="non-tech-note-card" tone="strong">
          <p className="card-copy">
            <strong>Note:</strong>
            {" "}Prizes for non-technical events will be announced on campus.
          </p>
        </GlassPanel>
        <div className="prize-grid">
          {events.map((event, index) => (
            <Reveal key={event.code} className="prize-card-reveal" delay={0.08 + index * 0.06} y={24} scale={0.98}>
              <PrizeCard
                title={event.name}
                prizes={event.prizes}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
