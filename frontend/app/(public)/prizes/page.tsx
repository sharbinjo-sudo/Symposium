import { PrizeCard } from "@/components/events/PrizeCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { getEvents } from "@/lib/api";

export default async function PrizesPage() {
  const events = await getEvents();

  return (
    <div className="section page-shell-block">
      <div className="container">
        <AnimatedHeading
          eyebrow="Prize Section"
          title="Premium podium cards for every technical event"
          copy="First place receives Rs. 1,000, second place receives Rs. 500, and first through third place receive certificates."
        />
        <div className="prize-grid">
          {events.map((event) => (
            <PrizeCard
              key={event.code}
              title={event.name}
              prizes={event.prizes}
              details={`${event.code} | Fee: Rs. ${event.feeAmount} | ${
                event.feeType === "per_team" ? "per team" : "per participant"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
