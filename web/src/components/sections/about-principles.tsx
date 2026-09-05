"use client";

import { useRef } from "react";
import { SectionIndex } from "@/components/motif/section-index";
import { Section } from "@/components/ui/section";
import { ABOUT_PRINCIPLES } from "@/content/about";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

/**
 * FINAL-DESIGN-01B-01 Section D - engineering mindset and problem-solving
 * approach, told through the same three verified ABOUT_PRINCIPLES the
 * old /about used. These three principles genuinely are the answer to
 * "how do you approach a new problem" - no new, separate claim is
 * introduced for that framing.
 *
 * FINAL-DESIGN-01B-01-R2: reworked from a flat grid of bordered panels
 * (an owner recording called out as a "generic card" look) into a single
 * connected sequence - a hairline runs the full row (desktop) / column
 * (mobile) behind three numbered markers, drawn in on scroll exactly
 * like about-timeline.tsx's and about-architecture.tsx's own connecting
 * lines (decorative-only, continuous scrub). Hovering a step shifts that
 * step's numbered marker to the accent color - a restrained CSS-only
 * interaction, not a new animation system - and the same rule is written
 * as `:focus-within` too, so the highlight still fires correctly if a
 * later revision adds a focusable element (e.g. a link) inside a panel.
 * No bordered box around any panel's body text, and no motion is applied
 * to the principle text itself - only the connecting line and the
 * marker's hover/focus color are ever animated.
 */
export function AboutPrinciples() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const mobileLineRef = useRef<HTMLDivElement>(null);

  useScrollReveal(
    rootRef,
    (api) => {
      if (lineRef.current) {
        api.gsap.to(lineRef.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: rootRef.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 },
        });
      }
      if (mobileLineRef.current) {
        api.gsap.to(mobileLineRef.current, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: rootRef.current, start: "top 80%", end: "bottom 65%", scrub: 0.6 },
        });
      }
    },
    [],
  );

  return (
    <Section className="border-t border-border">
      <SectionIndex n="04" label="Approach" className="mb-6" />
      <h2 className="max-w-xl text-display-sm text-ink-primary sm:text-display-md">How I think about a new problem</h2>
      <p className="mt-4 max-w-xl text-body text-ink-secondary">
        Three principles that hold regardless of the project - the engineering mindset behind every system on this site.
      </p>

      <div ref={rootRef} className="relative mt-14">
        {/* Mobile: vertical connecting line. */}
        <div aria-hidden className="absolute top-1 bottom-1 left-3.5 w-px bg-border sm:hidden" />
        <div ref={mobileLineRef} aria-hidden className="absolute top-1 bottom-1 left-3.5 w-px origin-top scale-y-0 bg-clay sm:hidden" />
        {/* Desktop: horizontal connecting line. */}
        <div aria-hidden className="absolute top-3.5 right-0 left-0 hidden h-px bg-border sm:block" />
        <div ref={lineRef} aria-hidden className="absolute top-3.5 left-0 hidden h-px w-full origin-left scale-x-0 bg-clay sm:block" />

        <ol className="flex flex-col gap-8 sm:grid sm:grid-cols-3 sm:gap-8">
          {ABOUT_PRINCIPLES.map((principle, i) => (
            <li key={principle.title} className="group relative pl-12 sm:pl-0">
              <span
                aria-hidden
                className="absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background font-mono text-caption-sm text-ink-tertiary transition-colors duration-(--motion-base) group-hover:border-clay group-hover:text-clay group-focus-within:border-clay group-focus-within:text-clay sm:static sm:mb-4"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-headline-md text-ink-primary">{principle.title}</p>
              <p className="mt-3 max-w-xs text-body-sm text-ink-secondary">{principle.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
