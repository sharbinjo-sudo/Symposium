import { siteConfig } from "@/lib/config/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="section-eyebrow">CYBERPUNK&apos;26</div>
            <h3>{siteConfig.heroSubtitle}</h3>
            <p className="footer-copy">{siteConfig.about}</p>
          </div>
          <div className="footer-column">
            <strong>Venue</strong>
            <span>{siteConfig.venue}</span>
            <span>{siteConfig.venueDetail}</span>
          </div>
          <div className="footer-column">
            <strong>Contact</strong>
            {siteConfig.contacts.map((item) => (
              <span key={item.label}>
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
