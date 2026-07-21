import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { GlobalWaterRippleLayer } from "@/components/ui/GlobalWaterRippleLayer";
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
    icon: "/vvcoe-logo.jpg",
    shortcut: "/vvcoe-logo.jpg",
    apple: "/vvcoe-logo.jpg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AuroraBackground />
        <GlobalWaterRippleLayer />
        <div className="page-shell">
          <Header />
          <main className="page-content">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
