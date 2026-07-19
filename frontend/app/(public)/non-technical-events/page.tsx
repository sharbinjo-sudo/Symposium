import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/config/site";

export default function NonTechnicalEventsPage() {
  return (
    <div className="section page-shell-block">
      <div className="container">
        <AnimatedHeading
          eyebrow="Non-Technical Events"
          title="Campus engagement events that complement the technical track"
          copy="These activities support the symposium atmosphere with stage participation, audience energy, and creative involvement on event day."
        />
        <div className="placeholder-grid">
          {siteConfig.nonTechnicalEvents.map((event, index) => (
            <Reveal key={event.name} delay={index * 0.08}>
              <GlassPanel className="placeholder-card">
                <div className="tag-row">
                  <span className="tag">Campus event</span>
                  <span className="tag">Live schedule</span>
                </div>
                <h4>{event.name}</h4>
                <p className="card-copy">{event.summary}</p>
              </GlassPanel>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
