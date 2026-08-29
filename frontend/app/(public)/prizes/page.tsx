import { PrizeCard } from "@/components/events/PrizeCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { getEvents } from "@/lib/api";

export default async function PrizesPage() {
  const events = await getEvents();

  return (
    <div className="section page-shell-block prizes-page">
      <div className="container">
        <div className="prizes-page-head">
          <AnimatedHeading
            eyebrow="Prize Section"
            title={["Premium podium cards", "for every technical event"]}
            copy="First place receives Rs. 1,000, second place receives Rs. 500, and every registered participant receives a certificate."
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
                details={`${event.code} | Fee: Rs. ${event.feeAmount} | ${
                  event.feeType === "per_team" ? "per team" : "per member"
                }`}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
