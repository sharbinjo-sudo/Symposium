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
          title="Guess the Lyrics, Bioscope, and Word Battle"
          copy="The non-technical track adds lighter stage energy to the symposium with music, cinema-inspired clues, and word-play challenges."
        />
        <Reveal className="non-tech-note-reveal" delay={0.06} y={20} scale={0.98}>
          <GlassPanel className="non-tech-note-card" tone="strong">
            <div>
              <span className="section-eyebrow">Offline registration note</span>
              <h3>Register on campus for Non-Tech events</h3>
            </div>
            <p className="card-copy">
              <strong>Note:</strong> Registration for non-technical events is offline, and prizes will also be given
              on campus.
            </p>
          </GlassPanel>
        </Reveal>
        <div className="placeholder-grid non-tech-event-grid">
          {siteConfig.nonTechnicalEvents.map((event, index) => (
            <Reveal key={event.name} delay={index * 0.08}>
              <GlassPanel className="placeholder-card">
                <div className="tag-row">
                  <span className="tag">Non-Tech event</span>
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
