import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";

const timelineItems = [
  {
    time: "10:00 AM - 11:00 AM",
    title: "Symposium Inauguration",
    detail: "Opening ceremony, welcome address, and formal inauguration of CYBERPUNK'26."
  },
  {
    time: "11:00 AM - 11:15 AM",
    title: "Break",
    detail: "Short interval before the technical event sessions begin."
  },
  {
    time: "11:15 AM - 1:30 PM",
    title: "Paper Presentation",
    detail: "Participants present their technical ideas, projects, or research work before the panel."
  },
  {
    time: "12:00 PM - 1:00 PM",
    title: "Code Busters",
    detail: "Programming, debugging, and logic-based challenge session."
  },
  {
    time: "1:00 PM - 1:30 PM",
    title: "Web Craft",
    detail: "Frontend development challenge focused on usable and responsive web experiences."
  },
  {
    time: "1:00 PM - 1:30 PM",
    title: "Visualytics",
    detail: "Data visualization and insight-building challenge. Participants may choose either Web Craft or Visualytics."
  },
  {
    time: "1:30 PM - 2:00 PM",
    title: "Non-Technical Events",
    detail: "First non-technical activity window, handled fully offline on campus."
  },
  {
    time: "2:00 PM - 3:00 PM",
    title: "Lunch",
    detail: "Lunch break for participants, coordinators, judges, and guests."
  },
  {
    time: "3:00 PM - 3:45 PM",
    title: "Non-Technical Events",
    detail: "Second non-technical activity window and final rounds."
  },
  {
    time: "3:45 PM - 4:15 PM",
    title: "Prize Distribution and Symposium Conclusion",
    detail: "Prize distribution, certificates, closing remarks, and formal conclusion."
  }
];

export default function TimelinePage() {
  return (
    <div className="section page-shell-block timeline-page">
      <div className="container">
        <div className="timeline-page-head">
          <AnimatedHeading
            eyebrow="Timeline"
            title="Event-day schedule"
            copy="Follow the planned flow for inauguration, technical events, non-technical events, lunch, and the closing ceremony."
          />
        </div>

        <Reveal className="timeline-note-reveal" delay={0.06} y={20} scale={0.98}>
          <GlassPanel className="technical-note-card timeline-note-card" tone="strong">
            <p className="card-copy technical-note-copy">
              <strong>Note:</strong>
              <span>
                Paper Presentation participants may leave the hall after completing their presentation so they can
                attend other events. Late arrival to Paper Presentation may be permitted when it is due to
                participation in another scheduled event.
              </span>
            </p>
          </GlassPanel>
        </Reveal>

        <div className="timeline-track" aria-label="CYBERPUNK'26 event timeline">
          {timelineItems.map((item, index) => (
            <Reveal key={`${item.time}-${item.title}`} delay={0.08 + index * 0.035} y={24} scale={0.98}>
              <GlassPanel className="timeline-card" tone="soft">
                <div className="timeline-card-marker" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="timeline-card-time">{item.time}</div>
                <div className="timeline-card-copy">
                  <h3>{item.title}</h3>
                  <p className="card-copy">{item.detail}</p>
                </div>
              </GlassPanel>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
