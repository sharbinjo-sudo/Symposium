import { EventCard } from "@/components/events/EventCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Countdown } from "@/components/ui/Countdown";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { HeroVisual } from "@/components/ui/HeroVisual";
import { Reveal } from "@/components/ui/Reveal";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { getEvents } from "@/lib/api";
import { siteConfig } from "@/lib/config/site";

const registrationSteps = [
  "Select an event and confirm the allowed team size.",
  "Add participant details with one clear team leader.",
  "Complete the registration payment securely through Razorpay.",
  "Review the full submission before confirmation."
];

export default async function HomePage() {
  const technicalEvents = await getEvents();

  return (
    <>
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <span className="hero-kicker">Department of Artificial Intelligence and Data Science</span>
            <h1 className="hero-title">CYBERPUNK&apos;26</h1>
            <p className="hero-tagline">THE FUTURE&apos;S TECH</p>
            <p className="hero-description">{siteConfig.heroCopy}</p>

            <div className="hero-actions">
              <ButtonLink href="/registration" variant="primary" magnetic>
                Register Now
              </ButtonLink>
              <ButtonLink href="/technical-events" variant="secondary">
                Explore Events
              </ButtonLink>
            </div>

            <div className="hero-facts">
              <div className="hero-fact-card">
                <span>Date</span>
                <strong>September 12, 2026</strong>
              </div>
              <div className="hero-fact-card">
                <span>Venue</span>
                <strong>{siteConfig.venueDetail}</strong>
              </div>
              <div className="hero-fact-card">
                <span>Registration deadline</span>
                <strong>September 10, 2026</strong>
              </div>
            </div>

            <div className="hero-meta">
              {siteConfig.heroStats.map((item) => (
                <div key={item.label} className="stat-block">
                  <strong>
                    <AnimatedCounter value={item.value} />
                  </strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual-column">
            <HeroVisual />
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="section section-tone-plain">
        <div className="container editorial-split">
          <div className="section-lead">
            <span className="section-number">01</span>
            <AnimatedHeading
              eyebrow="Countdown"
              title="One reliable timeline for event day"
              copy="The countdown remains functional while the surrounding presentation becomes calmer and more conference-like."
            />
          </div>
          <GlassPanel className="countdown-panel" tone="strong">
            <Countdown eventDate={siteConfig.eventDate} />
          </GlassPanel>
        </div>
      </section>

      <section className="section section-tone-plain">
        <div className="container editorial-split">
          <div className="section-lead">
            <span className="section-number">02</span>
            <AnimatedHeading
              eyebrow="About the symposium"
              title="A professional student symposium with a calmer, more trustworthy digital experience"
              copy={siteConfig.about}
            />
          </div>
          <div className="editorial-column-stack">
            <GlassPanel className="content-panel">
              <h4>Conference direction</h4>
              <p className="card-copy">
                The redesign treats the symposium like a premium editorial conference site: clearer hierarchy, lighter
                surfaces, strong readability, and fluid interaction instead of spectacle.
              </p>
            </GlassPanel>
            <GlassPanel className="content-panel">
              <h4>Facilities and operations</h4>
              <p className="card-copy">{siteConfig.facilitiesNote}</p>
            </GlassPanel>
          </div>
        </div>
      </section>

      <section className="section section-tone-mist">
        <div className="container">
          <div className="section-lead">
            <span className="section-number">03</span>
            <AnimatedHeading
              eyebrow="Technical event introduction"
              title="Four distinct event worlds shaped inside one consistent registration system"
              copy="Each event keeps its own visual language while staying part of the same academic, editorial design system."
            />
          </div>
          <div className="event-grid">
            {technicalEvents.map((event) => (
              <Reveal key={event.code} delay={event.order * 0.05}>
                <EventCard event={event} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tone-plain">
        <div className="container feature-band">
          <div className="section-lead">
            <span className="section-number">04</span>
            <AnimatedHeading
              eyebrow="Prize section"
              title="Clear rewards, consistent communication"
              copy="Prize messaging stays simple enough for posters, forms, admin review, and announcement slides."
            />
          </div>
          <GlassPanel className="content-panel content-panel-prize">
            <div className="prize-inline-grid">
              <div>
                <strong>Rs. 1,000</strong>
                <span>First prize</span>
              </div>
              <div>
                <strong>Rs. 500</strong>
                <span>Second prize</span>
              </div>
              <div>
                <strong>Top 3</strong>
                <span>Certificates awarded</span>
              </div>
            </div>
            <div className="cta-actions">
              <ButtonLink href="/prizes" variant="accent">
                View Prize Details
              </ButtonLink>
            </div>
          </GlassPanel>
        </div>
      </section>

      <section className="section section-tone-aqua">
        <div className="container editorial-split">
          <div className="section-lead">
            <span className="section-number">05</span>
            <AnimatedHeading
              eyebrow="Facilities and participant benefits"
              title="Built for participants, organizers, and college management"
              copy="The experience is easier to trust because the design now emphasizes clarity, traceability, and form usability."
            />
          </div>
          <div className="highlight-stack">
            {siteConfig.highlights.map((item) => (
              <div key={item} className="highlight-item">
                <span className="highlight-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tone-plain">
        <div className="container editorial-split">
          <div className="section-lead">
            <span className="section-number">06</span>
            <AnimatedHeading
              eyebrow="Non-technical events"
              title="Campus engagement events beyond the technical track"
              copy="The symposium also carries lighter audience-facing activities that add energy to the day without changing the technical registration flow."
            />
          </div>
          <div className="placeholder-grid">
            {siteConfig.nonTechnicalEvents.map((event, index) => (
              <Reveal key={event.name} delay={index * 0.08}>
                <GlassPanel className="placeholder-card">
                  <div className="tag-row">
                    <span className="tag">Campus event</span>
                    <span className="tag">Live participation</span>
                  </div>
                  <h4>{event.name}</h4>
                  <p className="card-copy">{event.summary}</p>
                </GlassPanel>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tone-mist">
        <div className="container editorial-split">
          <div className="section-lead">
            <span className="section-number">07</span>
            <AnimatedHeading
              eyebrow="Registration process"
              title="A guided submission flow that stays readable on mobile and desktop"
              copy="The registration system keeps the same backend logic, but the presentation now feels more deliberate and easier to follow."
            />
          </div>
          <div className="process-list">
            {registrationSteps.map((step, index) => (
              <div key={step} className="process-item">
                <span>{`0${index + 1}`}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tone-aqua">
        <div className="container">
          <div className="cta-panel">
            <div>
              <span className="section-number">08</span>
              <h3>{siteConfig.themeTagline}</h3>
              <p className="card-copy">
                The platform now balances professionalism, creativity, and confidence without slipping back into a
                gaming or cyberpunk visual language.
              </p>
            </div>
            <div className="cta-actions">
              <ButtonLink href="/registration" variant="primary" magnetic>
                Begin Registration
              </ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Contact Organizers
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
