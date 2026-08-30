import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";

const notes = [
  "The countdown shows the deadline for online registration. On-site registration will remain available on campus.",
  "To attend the symposium, registration for at least one primary technical event is mandatory.",
  "If time permits during the event, participants may also attend other technical or non-technical events.",
  "Registration for non-technical events will be handled offline.",
  "If your payment is rejected, you will receive an email notification. You may register again using the same details, with corrected payment proof and a valid UPI transaction ID.",
  "Prizes for non-technical events will be announced on campus.",
  "After registration, participants can check their registration status on the Status page."
];

export default function NotePage() {
  return (
    <div className="section page-shell-block note-page">
      <div className="container">
        <div className="note-page-head">
          <AnimatedHeading
            eyebrow="Note"
            title="Important registration notes"
            copy="Please review these points before completing your symposium registration."
          />
        </div>

        <Reveal delay={0.06} y={20} scale={0.98}>
          <GlassPanel className="non-tech-note-card note-page-card" tone="strong">
            <ul className="note-page-list">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </GlassPanel>
        </Reveal>
      </div>
    </div>
  );
}
