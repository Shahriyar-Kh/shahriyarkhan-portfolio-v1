import Image from "next/image";
import Link from "next/link";
import { ImageReveal } from "@/components/motif/image-reveal";
import { Section } from "@/components/ui/section";
import { SectionIndex } from "@/components/motif/section-index";
import { ABOUT_CAREER_STORY, ABOUT_INTRO, ABOUT_PREVIEW_CTA, ABOUT_PRINCIPLES, ABOUT_SPECIALIZATION_FALLBACK } from "@/content/about";

/**
 * Section D - the homepage's editorial About preview. Deliberately a
 * different composition from the hero: a portrait on the right in a
 * tighter, upright crop (vs. the hero's wide left-headline layout), text
 * built from a lead statement + a short numbered principles list rather
 * than a headline + role rotator. All copy is the same verified content
 * /about uses (content/about.ts) - never a second, drifting copy of it.
 * Uses the fallback specialization sentence directly rather than
 * threading the live SiteSetting.hero_subtitle through - that value is
 * fetched and preferred on /about itself; both are the same verified,
 * database-authored sentence family, so there's no truth drift here.
 */
export function ProfessionalStory() {
  const specialization = ABOUT_SPECIALIZATION_FALLBACK;
  return (
    <Section className="border-t border-border">
      <div className="grid gap-12 lg:grid-cols-[1fr_0.7fr] lg:items-start lg:gap-16">
        <div>
          <SectionIndex n="02" label={ABOUT_INTRO.eyebrow} className="mb-6" />
          <h2 className="max-w-xl text-display-sm text-ink-primary sm:text-display-md">{ABOUT_INTRO.title}</h2>
          <p className="mt-5 max-w-xl text-body-lg text-ink-secondary">{specialization}</p>
          <p className="mt-4 max-w-xl text-body text-ink-tertiary">{ABOUT_CAREER_STORY[0]}</p>

          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {ABOUT_PRINCIPLES.map((principle, i) => (
              <li key={principle.title} className="border-t-2 border-primary/60 pt-3">
                <span className="font-mono text-caption-sm text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-body-sm font-semibold text-ink-primary">{principle.title}</p>
              </li>
            ))}
          </ol>

          <Link
            href={ABOUT_PREVIEW_CTA.href}
            className="mt-8 inline-flex items-center gap-2 text-body-sm font-medium text-primary hover:underline"
            data-analytics-event="project_cta_click"
          >
            {ABOUT_PREVIEW_CTA.label} →
          </Link>
        </div>

        <ImageReveal className="mx-auto aspect-3/4 w-full max-w-sm rounded-sm bg-surface lg:mx-0">
          <Image
            src="/images/shary-photo.jpeg"
            alt="Shahriyar Khan at work"
            fill
            sizes="(min-width: 1024px) 24rem, 80vw"
            className="object-cover"
          />
        </ImageReveal>
      </div>
    </Section>
  );
}
