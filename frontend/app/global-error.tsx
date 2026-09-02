"use client";

import { useEffect, type CSSProperties } from "react";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background:
    "radial-gradient(circle at top left, rgba(0, 180, 216, 0.22), transparent 36%), linear-gradient(135deg, #fff8f9, #eefcff)"
};

const cardStyle: CSSProperties = {
  width: "min(100%, 520px)",
  padding: "32px",
  borderRadius: "28px",
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(18, 84, 112, 0.16)",
  boxShadow: "0 28px 90px rgba(44, 17, 21, 0.16)",
  color: "#2c1115",
  textAlign: "center",
  fontFamily: "\"Times New Roman\", Times, serif"
};

const titleStyle: CSSProperties = {
  margin: "16px 0 10px",
  fontSize: "clamp(30px, 5vw, 48px)",
  letterSpacing: "-0.05em"
};

const textStyle: CSSProperties = {
  margin: 0,
  color: "#5d4b51",
  lineHeight: 1.7
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "12px",
  marginTop: "24px"
};

const primaryButtonStyle: CSSProperties = {
  minHeight: "44px",
  padding: "0 18px",
  borderRadius: "999px",
  border: "0",
  background: "linear-gradient(135deg, #006d77, #00b4d8)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  border: "1px solid rgba(18, 84, 112, 0.18)",
  background: "rgba(255, 255, 255, 0.74)",
  color: "#125470",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center"
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("Application recovered from a root client error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main style={shellStyle} role="alert">
          <section style={cardStyle}>
            <div style={{ color: "#006d77", fontSize: "12px", fontWeight: 800, letterSpacing: "0.16em" }}>
              CYBERPUNK&apos;26 PAGE RECOVERY
            </div>
            <h1 style={titleStyle}>Loading page again</h1>
            <p style={textStyle}>
              The browser restored an old app state. Use one of these actions to fetch a fresh page safely.
            </p>
            <div style={actionRowStyle}>
              <button type="button" style={primaryButtonStyle} onClick={reset}>
                Try again
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => window.location.reload()}>
                Reload page
              </button>
              <a style={secondaryButtonStyle} href="/">
                Go home
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
