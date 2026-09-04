"use client";

import { useRef } from "react";
import { SectionIndex } from "@/components/motif/section-index";
import { Section } from "@/components/ui/section";
import { ENGAGEMENT_STEPS, ENGAGEMENT_STEP_DETAILS } from "@/content/services";
import { ENGINEERING_APPROACH_COPY } from "@/content/home";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

/**
 * Section I - the working methodology as a recognizable delivery system
 * (FINAL-DESIGN-01A-R2 §11): a horizontal progression on desktop with a
 * drawn orange delivery line, collapsing to a vertical line on mobile.
 * Framed as methodology, never as fabricated historical proof - no step
 * here claims a specific project outcome.
 *
 * Step naming stays ENGAGEMENT_STEPS (Discovery/Scope/Architecture/
 * Build/Test/Launch/Handover) rather than the shorter 6-step list R2's
 * brief sketches (Discover/Architect/Build/Verify/Launch/Improve): this
 * exact sequence is also the one every /services/[slug] page renders
 * (see content/services.ts's doc comment), and this phase is scoped to
 * the homepage only - renaming it here would make the homepage disagree
 * with every service page rather than upgrading how the shared sequence
 * is presented. The visual/motion upgrade below is the actual ask.
 *
 * FINAL-DESIGN-01A-R3: step text renders at full opacity unconditionally
 * (the R2 `staggerReveal("[data-process-step]")` opacity-gate is
 * removed - see experience-journey.tsx's doc comment for the identical
 * reasoning). Both delivery lines are continuous scrubs (non-`once`)
 * that rest at a valid `scale-0` default via plain CSS classes, not a
 * JS-set `gsap.fromTo` starting state.
 */
export function EngineeringApproach() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const mobileLineRef = useRef<HTMLDivElement>(null);

  useScrollReveal(rootRef, (api) => {
    if (lineRef.current) {
      api.gsap.to(lineRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%", end: "bottom 55%", scrub: 0.6 },
      });
    }
    if (mobileLineRef.current) {
      api.gsap.to(mobileLineRef.current, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 },
      });
    }
  }, []);

  return (
    <Section className="border-t border-border">
      <SectionIndex n="09" label="Approach" className="mb-6" />
      <h2 className="text-display-sm text-ink-primary sm:text-display-md">{ENGINEERING_APPROACH_COPY.title}</h2>
      <p className="mt-3 max-w-xl text-body text-ink-secondary">{ENGINEERING_APPROACH_COPY.subtitle}</p>

      <div ref={rootRef} className="relative mt-16">
        {/* Mobile: vertical line, one column. */}
        <div className="relative pl-8 sm:hidden">
          <div aria-hidden className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-border" />
          <div ref={mobileLineRef} aria-hidden className="absolute top-2 bottom-2 left-2.5 w-0.5 origin-top scale-y-0 bg-primary" />
          <ol className="flex flex-col gap-2">
            {ENGAGEMENT_STEPS.map((step, i) => (
              <li key={step} className="group relative rounded-md py-2 pr-2 pl-2 transition-colors duration-(--motion-base) hover:bg-paper-raised focus-within:bg-paper-raised">
                <span
                  aria-hidden
                  className="absolute top-2.5 -left-[calc(2rem-3px)] h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background transition-transform duration-(--motion-fast) group-hover:scale-125"
                />
                <span className="font-mono text-caption-sm text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-headline-sm text-ink-primary">{step}</p>
                <p className="mt-1 text-body-sm text-ink-secondary">{ENGAGEMENT_STEP_DETAILS[step]}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Desktop: horizontal progression with a drawn delivery line. */}
        <div className="hidden sm:block">
          <div className="relative mb-10 h-0.5 w-full bg-border">
            <div ref={lineRef} aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-primary" />
          </div>
          <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 xl:gap-y-0">
            {ENGAGEMENT_STEPS.map((step, i) => (
              <li key={step} className="group relative rounded-md p-2 -m-2 transition-colors duration-(--motion-base) hover:bg-paper-raised focus-within:bg-paper-raised">
                <span
                  aria-hidden
                  className="absolute -top-[2.9rem] left-0 h-3 w-3 rounded-full bg-primary ring-4 ring-background transition-transform duration-(--motion-fast) group-hover:scale-125 xl:left-1/2 xl:-translate-x-1/2"
                />
                <span className="font-mono text-caption-sm text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-headline-sm text-ink-primary xl:text-center">{step}</p>
                <p className="mt-2 max-w-56 text-body-sm text-ink-secondary xl:mx-auto xl:text-center">
                  {ENGAGEMENT_STEP_DETAILS[step]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
