import { ContactDetails } from "@/components/contact/contact-details";
import { InquiryForm } from "@/components/contact/inquiry-form";
import { Connector } from "@/components/motif/connector";
import { Node } from "@/components/motif/node";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { CONTACT_HERO, CONTACT_CLOSING_LINE, WHAT_HAPPENS_NEXT } from "@/content/contact-page";
import { CONTACT_FALLBACKS } from "@/content/site";
import type { ContactIntent } from "@/content/contact";
import type { Service, SiteSettings } from "@/lib/api/types";

export interface ContactViewProps {
  services: readonly Service[] | null;
  siteSettings: SiteSettings | null;
  initialIntent: ContactIntent;
  initialServiceId?: string | null;
}

/**
 * FINAL-DESIGN-01G-01 - the premium, conversion-focused Contact page for
 * two genuine audiences (recruiters/hiring managers, founders/clients).
 * Composition: hero (real h1 - the pre-redesign page had none) -> a
 * direct-contact panel (contact-details.tsx, untouched logic - real
 * SiteSettings with CONTACT_FALLBACKS fallback) beside the real
 * InquiryForm (validation/honeypot/backend contract all preserved
 * exactly) -> a factual "what happens next" register -> a restrained
 * closing line, deliberately not a second DualCta (Contact already is
 * the conversion destination).
 */
export function ContactView({ services, siteSettings, initialIntent, initialServiceId }: ContactViewProps) {
  const email = siteSettings?.public_email || CONTACT_FALLBACKS.email;

  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <SectionHeading as="h1" eyebrow={CONTACT_HERO.eyebrow} title={CONTACT_HERO.title} subtitle={CONTACT_HERO.lead} />
      </Section>

      <Section className="border-t border-border">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-label text-accent uppercase">Direct</p>
              <div className="mt-3">
                <Connector />
              </div>
            </div>
            <ContactDetails siteSettings={siteSettings} />
          </div>

          <InquiryForm
            services={(services ?? []).map((s) => ({ id: s.id, title: s.title }))}
            initialIntent={initialIntent}
            initialServiceId={initialServiceId ?? null}
            sourcePage="/contact"
          />
        </div>
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">What happens next</h2>
        <div className="relative mt-8">
          <div className="absolute top-3 right-0 left-0 hidden sm:block">
            <Connector />
          </div>
          <ol className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-0">
            {WHAT_HAPPENS_NEXT.map((step, i) => (
              <li key={step.title} className="relative flex flex-1 flex-col items-start gap-2 sm:items-center sm:text-center">
                <Node filled className="relative z-10 bg-background" size={8} />
                <span className="font-mono text-caption-sm text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-body-sm font-medium text-ink-primary">{step.title}</span>
                <span className="max-w-xs text-caption-sm text-ink-tertiary sm:text-center">{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section className="border-t border-border">
        <p className="max-w-xl text-body-sm text-ink-secondary">
          {CONTACT_CLOSING_LINE} Prefer email directly?{" "}
          <a href={`mailto:${email}`} className="font-medium text-primary hover:underline">
            {email}
          </a>
          .
        </p>
      </Section>
    </>
  );
}
