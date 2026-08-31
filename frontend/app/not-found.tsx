import { ButtonLink } from "@/components/ui/ButtonLink";
import { Reveal } from "@/components/ui/Reveal";

export default function NotFoundPage() {
  return (
    <section className="section page-shell-block">
      <div className="container" style={{ textAlign: "center" }}>
        <Reveal className="section-title-center" y={18}>
          <span className="section-eyebrow">Page not found</span>
          <h1 className="heading-as-h1" style={{ margin: "0.8rem 0" }}>
            404
          </h1>
          <p className="section-copy" style={{ maxWidth: "48ch", margin: "1rem auto 0" }}>
            The page you are looking for does not exist or has been moved. Check the URL or
            head back to the home page.
          </p>
        </Reveal>
        <Reveal delay={0.08} y={20}>
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: "1.6rem" }}>
            <ButtonLink href="/" variant="primary">
              Go home
            </ButtonLink>
            <ButtonLink href="/events" variant="secondary">
              Explore events
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
