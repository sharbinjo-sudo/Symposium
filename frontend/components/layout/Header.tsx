"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/prizes", label: "Prizes" },
  { href: "/timeline", label: "Timeline" },
  { href: "/status", label: "Status" },
  { href: "/contact", label: "Contact" }
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = pathname === "/";
  const showRegisterButton = !isHomePage && pathname !== "/registration";

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <header className={cn("site-header", scrolled && "site-header-scrolled")}>
      <div className={cn("site-header-inner", isHomePage && "site-header-inner-home")}>
        <div className="site-header-tide" aria-hidden="true" />
        <Link href="/" className="brand-lockup" aria-label="V V College of Engineering home">
          <span className="brand-seal">
            <Image
              src="/vvcoe-logo.jpg"
              alt="V V College of Engineering logo"
              width={46}
              height={46}
              className="brand-logo-image"
            />
          </span>
          <span className="brand-copy">
            <strong>V V COLLEGE OF ENGINEERING</strong>
            <span>AI &amp; Data Science Symposium</span>
          </span>
        </Link>

        <div className="site-nav-shell desktop-nav">
          <nav className="site-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn("site-nav-link", pathname === item.href && "is-active")}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="header-actions">
          <div className="nba-badge">
            <Image
              src="/nba.png"
              alt="NBA Accreditation"
              width={50}
              height={40}
              className="nba-badge-image"
              priority
            />
          </div>
          {showRegisterButton ? (
            <div className="header-actions-panel">
              <ButtonLink href="/registration" className="desktop-register header-register-button" variant="primary" magnetic>
                Register Now
              </ButtonLink>
            </div>
          ) : null}
          <button
            type="button"
            className={cn("mobile-menu-toggle", open && "is-open")}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((current) => !current)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={cn("mobile-nav-shell", open && "is-open")}>
        <div className="mobile-nav-backdrop" onClick={() => setOpen(false)} />
        <div id="mobile-nav-panel" className="mobile-nav-panel">
          <div className="mobile-nav-header">
            <div className="mobile-nav-brand">
              <span className="mobile-nav-seal">
                <Image
                  src="/vvcoe-logo.jpg"
                  alt="V V College of Engineering logo"
                  width={36}
                  height={36}
                  className="mobile-nav-seal-image"
                />
              </span>
              <div className="mobile-nav-brand-text">
                <strong>V V COLLEGE OF ENGINEERING</strong>
                <span>AI &amp; Data Science Symposium</span>
              </div>
            </div>
            <div className="mobile-nav-header-actions">
              <span className="nba-badge-mobile">
                <Image
                  src="/nba.png"
                  alt="NBA Accreditation"
                  width={44}
                  height={36}
                  className="nba-badge-image"
                />
              </span>
              <button
                type="button"
                className="mobile-nav-close"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>
          <div className="mobile-nav-links">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("mobile-nav-link", pathname === item.href && "is-active")}
                style={{ transitionDelay: `${index * 35}ms` }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {showRegisterButton ? (
            <div className="mobile-nav-actions">
              <ButtonLink href="/registration" className="mobile-nav-action-button" variant="primary">
                Register Now
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
