import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Inter, Sora } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { ClientRuntimeGuard } from "@/components/ui/ClientRuntimeGuard";
import { GlobalWaterRippleLayer } from "@/components/ui/GlobalWaterRippleLayer";
import { PageTransitionOverlay } from "@/components/ui/PageTransitionOverlay";
import "./globals.css";

const headingFont = Sora({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vvcoe-symposium.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CYBERPUNK'26 | National Level AI & Data Science Symposium",
    template: "%s | CYBERPUNK'26"
  },
  description:
    "A national-level technical symposium hosted by the Department of Artificial Intelligence and Data Science, V V College of Engineering. Register now for Paper Presentation, Code Busters, Web Craft, and Visualytics.",
  keywords: [
    "CYBERPUNK26",
    "national level symposium",
    "AI and Data Science",
    "paper presentation",
    "code busters",
    "web craft",
    "visualytics",
    "V V College of Engineering"
  ],
  authors: [{ name: "Department of AI & DS, V V College of Engineering" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "CYBERPUNK'26",
    title: "CYBERPUNK'26 | National Level AI & Data Science Symposium",
    description:
      "A national-level technical symposium hosted by the Department of AI & Data Science, V V College of Engineering. September 11, 2026.",
    url: SITE_URL
  },
  twitter: {
    card: "summary_large_image",
    title: "CYBERPUNK'26 | National Level AI & Data Science Symposium",
    description:
      "A national-level technical symposium hosted by the Department of AI & Data Science, V V College of Engineering. September 11, 2026."
  },
  icons: {
    icon: "/vvcoe-icon.png",
    shortcut: "/vvcoe-icon.png",
    apple: "/vvcoe-icon.png"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AuroraBackground />
        <GlobalWaterRippleLayer />
        <ClientRuntimeGuard />
        <Suspense fallback={null}>
          <PageTransitionOverlay />
        </Suspense>
        <div className="page-shell">
          <Header />
          <main className="page-content">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

