import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";

const notes = [
  "The countdown shows the deadline for online registration. On-site registration will remain available on campus.",
  "To attend the symposium, registration for at least one primary technical event is mandatory.",
  "If time permits during the event, participants may also attend other registered technical events and non-technical events.",
  "Non-technical events will be fully handled offline.",
  "Participants may choose either Web Craft or Visualytics, but not both, due to the event schedule.",
  "Paper Presentation participants may leave the hall after completing their presentation so they can attend other events. Late arrival to Paper Presentation may be permitted when it is due to participation in another scheduled event.",
  "If your payment is rejected, you will receive an email notification. You may register again using the same details, with corrected payment proof and a valid UPI transaction ID.",
  "Prizes for non-technical events will be announced on campus.",
  "After registration, participants can check their registration status on the Status page.",
  "Each participant must complete a separate registration. If grouping is required for an event, it will be coordinated on campus."
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
