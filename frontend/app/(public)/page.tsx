import { ButtonLink } from "@/components/ui/ButtonLink";
import { Countdown } from "@/components/ui/Countdown";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/config/site";

const homePageLinks = [
  {
    href: "/events",
    label: "All Events",
    copy: "Browse technical and non-technical events, view rules, and plan your participation."
  },
  {
    href: "/prizes",
    label: "Prizes",
    copy: "Prize amounts, certificates, and event-wise rewards."
  },
  {
    href: "/timeline",
    label: "Timeline",
    copy: "Event-day schedule, session flow, breaks, and closing ceremony."
  },
  {
    href: "/contact",
    label: "Contact",
    copy: "Convener, coordinators, phone number, and mail ID."
  }
];

const homeFacts = [
  {
    label: "Event time",
    value: "9:30 AM onwards"
  },
  {
    label: "Venue",
    value: siteConfig.venueDetail
  },
  {
    label: "Who can participate",
    value: "All engineering students"
  },
  {
    label: "Registration fee",
    value: "₹250 per member"
  },
  {
    label: "Registration deadline",
    value: "September 11, 2026, 12:30 AM"
  },
  {
    label: "Event date",
    value: "September 11, 2026"
  }
];

export default function HomePage() {
  return (
    <>
      <section className="hero home-frame-scene">
        <div className="container hero-layout home-hero-frame">
          <Reveal className="hero-copy" y={18}>
            <span className="hero-kicker">Department of Artificial Intelligence and Data Science</span>
            <h1 className="hero-title">CYBERPUNK&apos;26</h1>
            <p className="hero-tagline">THE FUTURE&apos;S TECH</p>
            <p className="hero-description">{siteConfig.heroCopy}</p>

            <div className="hero-actions">
              <ButtonLink href="/registration" variant="primary" magnetic>
                Register Now
              </ButtonLink>
              <ButtonLink href="/events" variant="secondary">
                Explore Events
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal className="hero-visual-column hero-countdown-column" delay={0.1} y={22} scale={0.98}>
            <GlassPanel className="hero-countdown-panel countdown-panel" tone="strong">
              <div className="hero-countdown-header">
                <span className="section-eyebrow">Registration countdown</span>
                <h2>
                  <span>Registration</span>
                  <span>closes in</span>
                </h2>
                <p className="card-copy">
                  Complete your registration before September 11, 12:30 AM so your event-day entry is ready.
                </p>
              </div>
              <Countdown eventDate={siteConfig.registrationDeadline} />
              <div className="hero-countdown-footer">
                <span>Event day: September 11, 2026, 9:30 AM onwards</span>
              </div>
            </GlassPanel>
          </Reveal>

          <Reveal className="hero-note-reveal" delay={0.06} y={18} scale={0.98}>
            <GlassPanel className="hero-note-card" tone="strong">
              <p className="card-copy hero-note-copy">
                <strong>Note:</strong>
                <span>
                  The countdown indicates the deadline for online registration. On-site registration will remain
                  available on campus.
                </span>
              </p>
            </GlassPanel>
          </Reveal>
        </div>

        <div className="container hero-facts hero-facts-strip">
          {homeFacts.map((item, index) => (
            <Reveal key={item.label} className="hero-fact-card" delay={0.08 + index * 0.035} y={16}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-routing-section">
        <div className="container">
          <div className="home-routing-panel">
            <Reveal className="home-routing-copy" y={20}>
              <span className="section-eyebrow">Separate pages</span>
              <h2>Use the dedicated pages for full details.</h2>
            </Reveal>
            <div className="home-link-grid">
              {homePageLinks.map((item, index) => (
                <Reveal key={item.href} className="home-link-reveal" delay={index * 0.06} y={22} scale={0.98}>
                  <GlassPanel className="home-link-card" tone="soft">
                    <h3>{item.label}</h3>
                    <p className="card-copy">{item.copy}</p>
                    <ButtonLink href={item.href} variant="secondary">
                      Open page
                    </ButtonLink>
                  </GlassPanel>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
