import Link from "next/link";
import { getSiteSettings } from "@/lib/api";
import { SignalLine } from "@/components/motif/signal-line";
import { SkMark } from "@/components/motif/sk-mark";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { PRIMARY_NAV } from "@/content/nav";
import { CONTACT_FALLBACKS, OWNER_NAME, SOCIAL_LINKS } from "@/content/site";

/**
 * Combines FINAL-DESIGN-01A section K's two halves - the contact
 * conversion band and the branded footer - into one component, since
 * this is shared chrome (rendered on every route) rather than a
 * homepage-only section. Full ink band, no copied wave artwork: the
 * signature signal-line motif carries the transition instead.
 */
export async function SiteFooter() {
  // Next dedupes this against any other getSiteSettings() call made
  // during the same request (e.g. the homepage's own Promise.all).
  const result = await getSiteSettings();
  const footerText = result.ok && result.data.footer_text ? result.data.footer_text : null;
  const email = (result.ok && result.data.public_email) || CONTACT_FALLBACKS.email;
  const location = (result.ok && result.data.public_location) || CONTACT_FALLBACKS.location;
  const year = new Date().getFullYear();

  return (
    <footer className="surface-ink">
      <div className="section-shell py-16 sm:py-24">
        <SignalLine variant="rise" pulses={2} className="mb-10 h-16 w-40" />
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-2xl text-display-sm text-paper-primary sm:text-display-md">
            Have a system to build, or a role to fill?
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button href="/contact?intent=freelance_project" variant="primary-on-ink" data-analytics-event="project_cta_click">
              Start a project
            </Button>
            <Button href="/contact?intent=hiring" variant="secondary-on-ink" data-analytics-event="recruiter_cta_click">
              Discuss a role
            </Button>
          </div>
        </div>
      </div>

      <div className="section-shell flex flex-col gap-10 border-t border-border-on-ink py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2 font-heading text-body-sm font-semibold text-paper-primary">
            <SkMark tone="mono" className="text-primary-on-ink" />
            {OWNER_NAME}
          </Link>
          <p className="mt-3 text-caption-sm text-paper-tertiary">
            {footerText ??
              "Python and Django engineering for REST APIs, authenticated business platforms, and deployed web products."}
          </p>
          <p className="mt-3 text-caption-sm text-paper-hint">{location}</p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {PRIMARY_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-caption-sm text-paper-tertiary hover:text-paper-primary">
              {item.label}
            </Link>
          ))}
          <Link href="/resume" className="text-caption-sm text-paper-tertiary hover:text-paper-primary">
            Résumé
          </Link>
          <Link href="/privacy" className="text-caption-sm text-paper-tertiary hover:text-paper-primary">
            Privacy
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <ExternalLink
            href={SOCIAL_LINKS.github}
            aria-label="GitHub"
            className="text-paper-tertiary hover:text-primary-on-ink"
            data-analytics-event="outbound_github"
          >
            <Icon.Github size={18} />
          </ExternalLink>
          <ExternalLink
            href={SOCIAL_LINKS.linkedin}
            aria-label="LinkedIn"
            className="text-paper-tertiary hover:text-primary-on-ink"
            data-analytics-event="outbound_linkedin"
          >
            <Icon.Linkedin size={18} />
          </ExternalLink>
          <a href={`mailto:${email}`} aria-label="Email" className="text-paper-tertiary hover:text-primary-on-ink">
            <Icon.Mail size={18} />
          </a>
        </div>
      </div>
      <div className="section-shell border-t border-border-on-ink py-4">
        <p className="text-caption-sm text-paper-hint">
          © {year} {OWNER_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
