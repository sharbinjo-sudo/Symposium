import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { siteConfig } from "@/lib/config/site";

export default function ContactPage() {
  return (
    <div className="section page-shell-block">
      <div className="container">
        <AnimatedHeading
          eyebrow="Contact"
          title="Organizer details and registration policies"
          copy="Use the official organizer contact below for registration support, verification queries, and participant communication."
        />
        <div className="feature-band">
          <GlassPanel className="content-panel">
            <h4>Points of contact</h4>
            <ul className="rule-list">
              {siteConfig.contacts.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}:</strong> {item.value}
                </li>
              ))}
            </ul>
          </GlassPanel>
          <GlassPanel className="content-panel">
            <h4>Privacy notice</h4>
            <p className="card-copy">
              Registration data is collected for event participation, payment verification, and organizer communication.
              Admin access is intended to be session-gated and audited from the backend.
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
