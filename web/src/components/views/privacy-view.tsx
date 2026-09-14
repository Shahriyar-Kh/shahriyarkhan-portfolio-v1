import Link from "next/link";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from "@/content/privacy";

/**
 * FINAL-DESIGN-01H-01 - the premium treatment for /privacy. This is a
 * dense, text-only page (no hero media, no form), so it uses the
 * "readable" shell (48rem) throughout instead of the standard 80rem
 * every visual/media section uses - see globals.css's "Shared shell
 * system" doc comment, and components/sections/client-faq.tsx for the
 * one other section already using it for the same reason.
 *
 * Deliberately not an accordion: every section stays visible by
 * default. A privacy page's job is disclosure, not compression - hiding
 * things like retention or who else processes the data behind a click
 * would work against the page's actual purpose, even though a
 * details/summary accordion (see ClientFaq) is otherwise this system's
 * established pattern for dense text content.
 */
export function PrivacyView() {
  return (
    <>
      <Section shell="readable" className="pt-16 pb-8 sm:pt-20">
        <SectionHeading as="h1" eyebrow="Privacy" title="Privacy" subtitle={PRIVACY_INTRO} />
      </Section>

      <Section shell="readable" className="border-t border-border pt-8 pb-20">
        <div className="flex flex-col divide-y divide-border border-t border-b border-border">
          {PRIVACY_SECTIONS.map((section) => (
            <div key={section.heading} className="flex flex-col gap-2 py-6">
              <h2 className="text-headline-sm text-ink-primary">{section.heading}</h2>
              <p className="text-body-sm text-ink-secondary">{section.body}</p>
              {section.cta && (
                <Link href={section.cta.href} className="text-body-sm font-medium text-primary hover:underline">
                  {section.cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
