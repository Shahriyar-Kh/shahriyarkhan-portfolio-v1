"use client";

import { useRef } from "react";
import { SectionIndex } from "@/components/motif/section-index";
import { Section } from "@/components/ui/section";
import { ABOUT_PRINCIPLES } from "@/content/about";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

/**
 * FINAL-DESIGN-01B-01 Section D - engineering mindset and problem-solving
 * approach, told through the same three verified ABOUT_PRINCIPLES the
 * old /about used, in a premium numbered-panel layout instead of a plain
 * three-column list. These three principles genuinely are the answer to
 * "how do you approach a new problem" - no new, separate claim is
 * introduced for that framing.
 *
 * Motion: a decorative top-rule per panel scales in from a scroll
 * trigger (continuous scrub, not `once`, matching the homepage's own
 * "decorative-only" GSAP scope) - the panel text itself is never
 * opacity-gated on scroll, so it is always fully visible in the base
 * render (no-JS, reduced motion, or a script error all leave it intact).
 */
export function AboutPrinciples() {
  const rootRef = useRef<HTMLDivElement>(null);

  useScrollReveal(
    rootRef,
    (api) => {
      const rules = rootRef.current?.querySelectorAll<HTMLElement>("[data-principle-rule]");
      if (!rules || rules.length === 0) return;
      api.gsap.to(Array.from(rules), {
        scaleX: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: rootRef.current, start: "top 75%", end: "top 40%", scrub: 0.6 },
      });
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

      <div ref={rootRef} className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {ABOUT_PRINCIPLES.map((principle, i) => (
          <div key={principle.title} className="relative pt-5">
            <span aria-hidden data-principle-rule className="absolute top-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-clay" />
            <span className="font-mono text-label text-primary">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-3 text-headline-md text-ink-primary">{principle.title}</p>
            <p className="mt-3 text-body-sm text-ink-secondary">{principle.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
