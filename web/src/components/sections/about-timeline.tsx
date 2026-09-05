"use client";

import Link from "next/link";
import { useRef } from "react";
import { SectionIndex } from "@/components/motif/section-index";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { ABOUT_RECORD_PREVIEW_CTA, ABOUT_TIMELINE_COPY } from "@/content/about";
import type { Experience } from "@/lib/api/types";
import { formatDateRange } from "@/lib/format";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { cn } from "@/lib/cn";

export interface AboutTimelineProps {
  experiences: readonly Experience[] | null;
}

/**
 * FINAL-DESIGN-01B-01 Section E - a center-line, alternating-side career
 * timeline (desktop) collapsing to a single left-aligned column on
 * mobile - the "strong visual variety" requirement's timeline, built to
 * read differently from the homepage's own single-column
 * ExperienceJourney (sections/experience-journey.tsx, untouched) even
 * though both draw from the identical real Experience API data.
 *
 * Every card's own text stays left-aligned regardless of which side it
 * sits on (a right-aligned paragraph is genuinely harder to read, so
 * "alternating" here means which grid column each card occupies, not
 * mirrored text). Every row's real text (title, company, dates,
 * achievements, technologies) renders at full opacity unconditionally -
 * only the connecting line's growth and each dot's "current focus"
 * highlight are GSAP-scrubbed decoration, matching experience-
 * journey.tsx's own motion-hierarchy rule exactly (see that file's doc
 * comment for the full reasoning this mirrors).
 */
export function AboutTimeline({ experiences }: AboutTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef(new Map<number, HTMLSpanElement>());
  const rowRefs = useRef(new Map<number, HTMLLIElement>());

  useScrollReveal(
    rootRef,
    (api) => {
      if (lineRef.current) {
        api.gsap.to(lineRef.current, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: rootRef.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 },
        });
      }
      for (const [id, row] of rowRefs.current.entries()) {
        const dot = dotRefs.current.get(id);
        if (!dot) continue;
        api.ScrollTrigger.create({
          trigger: row,
          start: "top 65%",
          end: "bottom 45%",
          toggleClass: { targets: dot, className: "is-active" },
        });
      }
    },
    [experiences?.length],
  );

  return (
    <Section className="border-t border-border">
      <SectionIndex n="03" label={ABOUT_TIMELINE_COPY.eyebrow} className="mb-6" />
      <h2 className="max-w-xl text-display-sm text-ink-primary sm:text-display-md">{ABOUT_TIMELINE_COPY.title}</h2>
      <p className="mt-4 max-w-xl text-body text-ink-secondary">{ABOUT_TIMELINE_COPY.lead}</p>

      <div ref={rootRef} className="mt-14">
        {!experiences ? (
          <EmptyState title="Experience data is temporarily unavailable." />
        ) : experiences.length === 0 ? (
          <EmptyState title="No published experience yet." />
        ) : (
          <div className="relative">
            {/* Mobile/tablet: single left-aligned line. Desktop (lg+): a
                centered line with cards alternating left/right. */}
            <div aria-hidden className="absolute top-0 bottom-0 left-2.5 w-0.5 bg-border lg:left-1/2 lg:-translate-x-1/2" />
            <div
              ref={lineRef}
              aria-hidden
              className="absolute top-0 bottom-0 left-2.5 w-0.5 origin-top scale-y-0 bg-clay lg:left-1/2 lg:-translate-x-1/2"
            />

            <ol className="flex flex-col gap-10 lg:gap-6">
              {experiences.map((role, i) => {
                const onRight = i % 2 === 1;
                return (
                  <li
                    key={role.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(role.id, el);
                      else rowRefs.current.delete(role.id);
                    }}
                    className="relative pl-8 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:pl-0"
                  >
                    <span
                      aria-hidden
                      ref={(el) => {
                        if (el) dotRefs.current.set(role.id, el);
                        else dotRefs.current.delete(role.id);
                      }}
                      className={cn(
                        "absolute top-1.5 -left-[3px] h-3 w-3 rounded-full ring-4 ring-background transition-[background-color,transform] duration-(--motion-base) lg:left-1/2 lg:-translate-x-1/2 [&.is-active]:scale-110 [&.is-active]:bg-clay",
                        role.current_role ? "bg-clay" : "bg-border",
                      )}
                    />

                    {/* Desktop: the card sits in the left or right column
                        depending on index parity (the opposite column is
                        an empty spacer for this row), creating the
                        alternating rhythm. Mobile: always the single
                        left-aligned column, in real document order. */}
                    <div aria-hidden className={cn("hidden lg:block", onRight ? "lg:col-start-1 lg:row-start-1" : "lg:col-start-2 lg:row-start-1")} />
                    <div className={cn("lg:row-start-1", onRight ? "lg:col-start-2 lg:pl-12" : "lg:col-start-1 lg:pr-12")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-caption-sm text-ink-hint">{formatDateRange(role.start_date, role.end_date, role.current_role)}</p>
                        {role.current_role && (
                          <span className="border border-primary/40 px-1.5 py-0.5 font-mono text-caption-sm text-primary uppercase">Current</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-headline-md text-ink-primary">{role.role_title}</p>
                      <p className="text-body-sm text-ink-secondary">
                        {role.company_name}
                        {role.location ? ` · ${role.location}` : ""}
                      </p>
                      {role.description && <p className="mt-3 max-w-md text-body-sm text-ink-tertiary">{role.description}</p>}
                      {role.achievements.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-1.5">
                          {role.achievements.slice(0, 3).map((achievement) => (
                            <li key={achievement} className="flex max-w-md items-start gap-2 text-body-sm text-ink-secondary">
                              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-clay" />
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      )}
                      {role.technologies.length > 0 && (
                        <ul className="mt-4 flex flex-wrap gap-2">
                          {role.technologies.slice(0, 5).map((tech) => (
                            <li key={tech.id}>
                              <Badge>{tech.name}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      {experiences && experiences.length > 0 && (
        <Link href={ABOUT_RECORD_PREVIEW_CTA.href} className="mt-8 inline-block text-body-sm font-medium text-primary hover:underline">
          {ABOUT_RECORD_PREVIEW_CTA.label} →
        </Link>
      )}
    </Section>
  );
}
