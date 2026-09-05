import Image from "next/image";
import { ImageReveal } from "@/components/motif/image-reveal";
import { SectionIndex } from "@/components/motif/section-index";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { ABOUT_CAREER_STORY, ABOUT_EDUCATION_COPY, ABOUT_LANGUAGES } from "@/content/about";
import type { Education, Experience } from "@/lib/api/types";
import { formatDateRange, formatMonthYear } from "@/lib/format";

export interface AboutNarrativeProps {
  experiences: readonly Experience[] | null;
  education: readonly Education[] | null;
}

/**
 * FINAL-DESIGN-01B-01 Section C - the full career narrative (both
 * ABOUT_CAREER_STORY paragraphs, not the homepage's single-paragraph
 * preview in professional-story.tsx). Portrait on the left this time
 * (professional-story.tsx puts it on the right) so the two pages read as
 * distinct compositions of the same real photo and copy, never a
 * reflowed duplicate.
 *
 * FINAL-DESIGN-01B-01-R2: two changes from an owner recording review.
 * ABOUT_CAREER_STORY is now four short blocks instead of two dense
 * paragraphs (same sentences, just split at sentence boundaries - no
 * fact changed). The standalone Education section (a single real record
 * in an otherwise-empty full-width band) is gone; its content now lives
 * here as a compact "Education" milestone alongside a "Now" milestone
 * for the current role, both sourced from the same live API data the
 * Timeline and résumé already use - never a second, hand-typed copy of
 * either fact.
 *
 * The education milestone keeps the same null-vs-empty honesty the rest
 * of the page uses: a failed fetch (`null`) says so in place of the
 * degree; a genuinely empty result quietly omits the milestone, the same
 * "don't report a non-error as an error" precedent proof-strip.tsx
 * already sets for a missing/zero count.
 */
export function AboutNarrative({ experiences, education }: AboutNarrativeProps) {
  const degree = education && education.length > 0 ? education[0] : null;
  const currentRole = experiences?.find((role) => role.current_role) ?? experiences?.[0] ?? null;
  const showEducationSlot = education === null || degree !== null;

  return (
    <Section className="border-t border-border">
      <div className="grid gap-12 lg:grid-cols-[0.7fr_1fr] lg:items-start lg:gap-16">
        <ImageReveal className="mx-auto aspect-3/4 w-full max-w-sm rounded-sm bg-surface lg:mx-0">
          <Image
            src="/images/shary-photo.jpeg"
            alt="Shahriyar Khan at work"
            fill
            sizes="(min-width: 1024px) 24rem, 80vw"
            className="object-cover"
          />
        </ImageReveal>

        <div>
          <SectionIndex n="02" label="Career" className="mb-6" />
          <h2 className="max-w-xl text-display-sm text-ink-primary sm:text-display-md">The career story</h2>
          <div className="mt-6 flex flex-col gap-4">
            {ABOUT_CAREER_STORY.map((paragraph) => (
              <p key={paragraph} className="max-w-2xl text-body text-ink-secondary">
                {paragraph}
              </p>
            ))}
          </div>

          {(showEducationSlot || currentRole) && (
            <dl className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
              {showEducationSlot && (
                <div>
                  <dt className="font-mono text-caption-sm text-ink-hint uppercase">{ABOUT_EDUCATION_COPY.eyebrow}</dt>
                  {degree ? (
                    <>
                      <dd className="mt-1.5 text-body-sm font-medium text-ink-primary">{degree.degree}</dd>
                      <dd className="text-caption-sm text-ink-tertiary">
                        {degree.institution} · {formatMonthYear(degree.end_date ?? degree.start_date)}
                      </dd>
                      {degree.description && <dd className="mt-1 text-caption-sm text-ink-hint">{degree.description}</dd>}
                    </>
                  ) : (
                    <dd className="mt-1.5 text-caption-sm text-ink-hint">Education data is temporarily unavailable.</dd>
                  )}
                </div>
              )}
              {currentRole && (
                <div>
                  <dt className="font-mono text-caption-sm text-ink-hint uppercase">Now</dt>
                  <dd className="mt-1.5 text-body-sm font-medium text-ink-primary">{currentRole.role_title}</dd>
                  <dd className="text-caption-sm text-ink-tertiary">
                    {currentRole.company_name} · {formatDateRange(currentRole.start_date, currentRole.end_date, currentRole.current_role)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {ABOUT_LANGUAGES.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-caption-sm text-ink-hint uppercase">Languages</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {ABOUT_LANGUAGES.map((language) => (
                  <li key={language}>
                    <Badge>{language}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
