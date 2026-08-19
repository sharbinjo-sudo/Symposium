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

export const metadata: Metadata = {
  title: "CYBERPUNK'26",
  description: "Department of Artificial Intelligence and Data Science symposium platform.",
  icons: {
    icon: "/vvcoe-icon.png",
    shortcut: "/vvcoe-icon.png",
    apple: "/vvcoe-icon.png"
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

