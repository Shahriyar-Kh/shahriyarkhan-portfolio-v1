"use client";

import Link from "next/link";
import { useRef } from "react";
import { SectionIndex } from "@/components/motif/section-index";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { formatDateRange } from "@/lib/format";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { cn } from "@/lib/cn";
import type { Experience } from "@/lib/api/types";

export interface ExperienceJourneyProps {
  experiences: readonly Experience[] | null;
}

/**
 * Section H - executive-scannable career timeline (FINAL-DESIGN-01A-R2
 * §10): a fixed date column, one-line-clamped responsibility summary
 * (the full description stays intact on /experience - this is a
 * homepage preview, not a second copy of the record), 2-3 strongest
 * achievements, and a growing progression line tied to scroll. No
 * pinning, no scroll hijacking - the line's growth is a scrubbed visual
 * echo of scroll position, not something the user waits on.
 *
 * FINAL-DESIGN-01A-R3: every row's own text renders at full opacity
 * unconditionally in JSX/CSS - the R2 `staggerReveal("[data-role-row]")`
 * opacity:0-then-ScrollTrigger call is removed entirely (this is a
 * "primary-narrative" section per the R3 motion hierarchy, but that only
 * means it keeps a GSAP-driven line; real content is never opacity-
 * gated on scroll position, closing the blank-content defect a full-page
 * screenshot capture could trigger). GSAP is scoped to two purely
 * decorative, continuous (non-`once`) effects: the line's scrub-grown
 * fill, and each row's dot lighting up as it's the current scroll focus.
 * Both rest at a valid, fully-visible-content default with zero JS.
 */
export function ExperienceJourney({ experiences }: ExperienceJourneyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef(new Map<number, HTMLSpanElement>());
  const rowRefs = useRef(new Map<number, HTMLLIElement>());

  useScrollReveal(rootRef, (api) => {
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
        start: "top 60%",
        end: "bottom 40%",
        toggleClass: { targets: dot, className: "is-active" },
      });
    }
  }, [experiences?.length]);

  return (
    <Section className="border-t border-border">
      <SectionIndex n="08" label="Experience" className="mb-6" />
      <h2 className="text-display-sm text-ink-primary sm:text-display-md">Where this experience comes from</h2>

      <div ref={rootRef} className="mt-10">
        {!experiences ? (
          <EmptyState title="Experience data is temporarily unavailable." />
        ) : experiences.length === 0 ? (
          <EmptyState title="No published experience yet." />
        ) : (
          <div className="relative pl-8">
            <div aria-hidden className="absolute top-0 bottom-0 left-2.5 w-0.5 bg-border" />
            <div ref={lineRef} aria-hidden className="absolute top-0 bottom-0 left-2.5 w-0.5 origin-top scale-y-0 bg-clay" />

            <ol className="flex flex-col gap-9">
              {experiences.map((role) => (
                <li
                  key={role.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(role.id, el);
                    else rowRefs.current.delete(role.id);
                  }}
                  className="relative sm:grid sm:grid-cols-[7rem_1fr] sm:gap-6"
                >
                  <span
                    aria-hidden
                    ref={(el) => {
                      if (el) dotRefs.current.set(role.id, el);
                      else dotRefs.current.delete(role.id);
                    }}
                    className={cn(
                      "absolute top-1.5 -left-[calc(2rem-3px)] h-2.5 w-2.5 rounded-full ring-4 ring-background transition-[background-color,transform] duration-(--motion-base) [&.is-active]:scale-110 [&.is-active]:bg-clay",
                      role.current_role ? "bg-clay" : "bg-border",
                    )}
                  />

                  <p className="font-mono text-caption-sm text-ink-hint sm:pt-0.5">
                    {formatDateRange(role.start_date, role.end_date, role.current_role)}
                  </p>

                  <div className="mt-1 sm:mt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-headline-md text-ink-primary">{role.role_title}</p>
                      {role.current_role && (
                        <span className="border border-primary/40 px-1.5 py-0.5 font-mono text-caption-sm text-primary uppercase">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-ink-secondary">
                      {role.company_name}
                      {role.location ? ` · ${role.location}` : ""}
                    </p>
                    {role.description && <p className="mt-2 line-clamp-1 max-w-xl text-body-sm text-ink-tertiary">{role.description}</p>}
                    {role.achievements.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {role.achievements.slice(0, 3).map((achievement) => (
                          <li key={achievement} className="flex items-start gap-2 text-body-sm text-ink-secondary">
                            <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-clay" />
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    )}
                    {role.technologies.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {role.technologies.slice(0, 4).map((tech) => (
                          <li key={tech.id}>
                            <Badge>{tech.name}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <Link href="/experience" className="mt-8 inline-block text-body-sm font-medium text-primary hover:underline">
        View the full structured record →
      </Link>
    </Section>
  );
}
