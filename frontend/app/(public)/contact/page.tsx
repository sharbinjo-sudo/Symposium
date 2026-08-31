import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/config/site";

const studentCoordinatorYears = [
  {
    year: "3rd Year",
    groups: [
      {
        label: "Boys",
        names: ["Jerish Manickam", "Kishore", "Mohammed Aslam", "Muthu Pandi", "Sugi", "Yuthistran"]
      },
      {
        label: "Girls",
        names: ["Abarna", "Abinaya", "Aiswarya", "Thangakani Sivatharshini", "Thanusha", "Vidhya"]
      }
    ]
  },
  {
    year: "2nd Year",
    groups: [
      {
        label: "Boys",
        names: ["Allan Jebas Prince", "Balamurugan", "Esakki Muthu", "Mugudan"]
      },
      {
        label: "Girls",
        names: ["Jeffina Clemency", "Pooja", "Ramalakshmi", "Subasree"]
      }
    ]
  }
];

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
                and includes technical and non-technical events for individually registered participants.
              </p>
            </GlassPanel>
          </Reveal>
        </div>

        <section className="student-coordinator-section" aria-labelledby="student-coordinators-title">
          <div className="student-coordinator-head">
            <span className="section-eyebrow">Student Coordinators</span>
            <h3 id="student-coordinators-title">Year-wise support team</h3>
          </div>

          <div className="student-coordinator-grid">
            {studentCoordinatorYears.map((yearGroup, yearIndex) => (
              <Reveal key={yearGroup.year} className="contact-card-reveal" delay={0.12 + yearIndex * 0.08} y={24} scale={0.98}>
                <GlassPanel className="content-panel student-coordinator-card">
                  <div className="student-coordinator-card-head">
                    <h4>{yearGroup.year}</h4>
                  </div>

                  <div className="student-coordinator-groups">
                    {yearGroup.groups.map((group) => (
                      <div key={`${yearGroup.year}-${group.label}`} className="student-coordinator-group">
                        <strong>{group.label}</strong>
                        <ul>
                          {group.names.map((name) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
