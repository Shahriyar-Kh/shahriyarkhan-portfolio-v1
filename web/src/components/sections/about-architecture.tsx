"use client";

import { useRef } from "react";
import { CategoryIcon } from "@/components/icons/tech-icons";
import { SectionIndex } from "@/components/motif/section-index";
import { Section } from "@/components/ui/section";
import { ABOUT_ARCHITECTURE_COPY, ABOUT_ARCHITECTURE_LAYERS } from "@/content/about";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

/**
 * FINAL-DESIGN-01B-01 Section F - the "architecture or methodology
 * visual" requirement: a left-to-right (desktop) / top-to-bottom
 * (mobile) system diagram - Interface → API and data model → Source of
 * truth → Running system - illustrated with the exact same CategoryIcon
 * marks the real Skills API's own category names use elsewhere on the
 * site (components/icons/tech-icons.tsx), never a generic AI-card
 * layout or an invented framework name. content/about.ts's
 * ABOUT_ARCHITECTURE_LAYERS is capability/framing copy only - it never
 * claims this is any one specific project's literal architecture.
 *
 * FINAL-DESIGN-01B-01-R2: an owner recording called the diagram too
 * small to read comfortably and asked for the connecting line to read
 * as an actual request/system flow rather than a static drawn
 * underline. Marker circles, icon size, and heading type are larger;
 * a small dot now travels the same connecting line in sync with its
 * draw-in scrub (left-to-right on desktop, top-to-bottom on mobile),
 * giving the line a direction instead of just a length. Both the line
 * draw and the traveling dot are decorative-only (aria-hidden, no
 * information) - every layer's icon and text still render at full
 * opacity unconditionally, matching this page's motion-hierarchy rule.
 */
export function AboutArchitecture() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const mobileLineRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);
  const mobilePulseRef = useRef<HTMLSpanElement>(null);

  useScrollReveal(
    rootRef,
    (api) => {
      const scrollTrigger = { trigger: rootRef.current, start: "top 70%", end: "bottom 55%", scrub: 0.6 };
      if (lineRef.current) {
        api.gsap.to(lineRef.current, { scaleX: 1, ease: "none", scrollTrigger });
      }
      if (pulseRef.current) {
        api.gsap.fromTo(pulseRef.current, { left: "0%" }, { left: "100%", ease: "none", scrollTrigger });
      }

      const mobileScrollTrigger = { trigger: rootRef.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 };
      if (mobileLineRef.current) {
        api.gsap.to(mobileLineRef.current, { scaleY: 1, ease: "none", scrollTrigger: mobileScrollTrigger });
      }
      if (mobilePulseRef.current) {
        api.gsap.fromTo(mobilePulseRef.current, { top: "0%" }, { top: "100%", ease: "none", scrollTrigger: mobileScrollTrigger });
      }
    },
    [],
  );

  return (
    <Section shell="wide" className="border-t border-border bg-surface-olive">
      <SectionIndex n="06" label={ABOUT_ARCHITECTURE_COPY.eyebrow} tone="paper" className="mb-6" />
      <h2 className="max-w-xl text-display-sm text-paper-primary sm:text-display-md">{ABOUT_ARCHITECTURE_COPY.title}</h2>
      <p className="mt-4 max-w-xl text-body text-paper-tertiary">{ABOUT_ARCHITECTURE_COPY.lead}</p>

      <div ref={rootRef} className="relative mt-20">
        {/* Mobile: vertical progression with a directional traveling dot. */}
        <div className="relative pl-10 sm:hidden">
          <div aria-hidden className="absolute top-2 bottom-2 left-3.5 w-0.5 bg-border-on-ink" />
          <div ref={mobileLineRef} aria-hidden className="absolute top-2 bottom-2 left-3.5 w-0.5 origin-top scale-y-0 bg-primary-on-ink" />
          <span ref={mobilePulseRef} aria-hidden className="absolute left-[11px] h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
          <ol className="flex flex-col gap-10">
            {ABOUT_ARCHITECTURE_LAYERS.map((layer) => {
              const Icon = CategoryIcon[layer.category];
              return (
                <li key={layer.category} className="relative">
                  <span aria-hidden className="absolute top-0 -left-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-primary-on-ink ring-4 ring-surface-olive">
                    <Icon size={18} />
                  </span>
                  <p className="font-mono text-caption-sm text-paper-tertiary uppercase">{layer.category}</p>
                  <p className="mt-1 text-headline-md text-paper-primary">{layer.title}</p>
                  <p className="mt-1.5 text-body-sm text-paper-tertiary">{layer.body}</p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Desktop: horizontal progression with a drawn, directional connecting line. */}
        <div className="hidden sm:block">
          <div className="relative mb-14 h-0.5 w-full bg-border-on-ink">
            <div ref={lineRef} aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-primary-on-ink" />
            <span ref={pulseRef} aria-hidden className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          </div>
          <ol className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT_ARCHITECTURE_LAYERS.map((layer, i) => {
              const Icon = CategoryIcon[layer.category];
              const isLast = i === ABOUT_ARCHITECTURE_LAYERS.length - 1;
              return (
                <li key={layer.category} className="relative">
                  <span
                    aria-hidden
                    className="absolute -top-[4.75rem] left-0 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-primary-on-ink ring-4 ring-surface-olive"
                  >
                    <Icon size={22} />
                  </span>
                  {!isLast && (
                    <span aria-hidden className="absolute -top-[3.4rem] -right-6 hidden font-mono text-body text-border-on-ink lg:-right-7 lg:block">
                      →
                    </span>
                  )}
                  <p className="font-mono text-caption-sm text-paper-tertiary uppercase">{layer.category}</p>
                  <p className="mt-1.5 text-headline-lg text-paper-primary">{layer.title}</p>
                  <p className="mt-2 max-w-64 text-body-sm text-paper-tertiary">{layer.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Section>
  );
}
