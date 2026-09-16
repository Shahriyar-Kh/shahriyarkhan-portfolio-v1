import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { AnalyticsListener } from "@/components/analytics/analytics-listener";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher-client";
import { RouteScrollReset } from "@/components/layout/route-scroll-reset";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollProgress } from "@/components/motif/scroll-progress";
import { JsonLd } from "@/components/seo/json-ld";
import { SkipLink } from "@/components/ui/skip-link";
import { SITE_URL } from "@/content/site";
import { personSchema, websiteSchema } from "@/lib/json-ld";

// The editorial display face - distinctive, serif, premium-studio rather
// than the generic geometric-sans look most AI-generated portfolios
// converge on. Self-hosted via next/font at build time (no runtime
// remote font request, no render-blocking third-party origin).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

// Accent face for data/annotations only - not preloaded, since it's
// typically below the fold (section numbers, tech names, claim dates).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Shahriyar Khan — Software Engineer",
    template: "%s — Shahriyar Khan",
  },
  description: "Python and Django engineering for REST APIs, authenticated business platforms, and deployed web products.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#faf6ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body">
        <JsonLd data={personSchema()} />
        <JsonLd data={websiteSchema()} />
        <AnalyticsListener />
        <SkipLink />
        <ScrollProgress />
        <SiteHeader />
        <RouteScrollReset />
        <main id="main">{children}</main>
        <SiteFooter />
        <AssistantLauncher />
      </body>
    </html>
  );
}
