import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/config/site";

export default function ContactPage() {
  return (
    <div className="section page-shell-block contact-page">
      <div className="container">
        <div className="contact-page-head">
          <AnimatedHeading
            eyebrow="Contact"
            title="Organizer details and registration policies"
            copy="Use the official organizer contact below for registration support, verification queries, and participant communication."
          />
        </div>
        <div className="feature-band contact-feature-band">
          <Reveal className="contact-card-reveal" delay={0.08} y={24} scale={0.98}>
            <GlassPanel className="content-panel">
              <h4>Points of contact</h4>
              <ul className="rule-list">
                {siteConfig.contacts.map((item) => (
                  <li key={`${item.label}-${item.value}`}>
                    <strong>{item.label}:</strong> {item.value}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </Reveal>
          <Reveal className="contact-card-reveal" delay={0.16} y={24} scale={0.98}>
            <GlassPanel className="content-panel">
              <h4>Official event details</h4>
              <p className="card-copy">
                CYBERPUNK&apos;26 is a national-level technical symposium by the Department of Artificial Intelligence
                and Data Science, V V College of Engineering. The event starts at 9:30 AM on September 11, 2026,
                and includes technical and non-technical events for solo or team participation.
              </p>
            </GlassPanel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
