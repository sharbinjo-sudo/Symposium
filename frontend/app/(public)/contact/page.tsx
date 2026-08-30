import Link from "next/link";
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
                and includes technical and non-technical events for solo or team participation.
              </p>
            </GlassPanel>
          </Reveal>
          <Reveal className="contact-card-reveal community-card-reveal" delay={0.24} y={24} scale={0.98}>
            <GlassPanel className="content-panel community-card">
              <h4>Community &amp; Updates</h4>
              <p className="card-copy">
                Join our WhatsApp group for event updates and quick support.
              </p>
              <Link
                href={siteConfig.community.whatsappGroup}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-link"
                aria-label="Join WhatsApp Group"
              >
                <svg className="whatsapp-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span>Join WhatsApp Group</span>
              </Link>
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
