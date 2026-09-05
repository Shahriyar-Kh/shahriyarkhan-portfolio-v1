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
 * Motion: a single connecting line draws in on scroll (continuous
 * scrub), decorative only - every layer's icon and text render at full
 * opacity unconditionally, matching every other "primary-narrative"
 * section's motion-hierarchy rule on this page.
 */
export function AboutArchitecture() {
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
    },
    [],
  );

  return (
    <Section shell="wide" className="border-t border-border bg-surface-olive">
      <SectionIndex n="06" label={ABOUT_ARCHITECTURE_COPY.eyebrow} tone="paper" className="mb-6" />
      <h2 className="max-w-xl text-display-sm text-paper-primary sm:text-display-md">{ABOUT_ARCHITECTURE_COPY.title}</h2>
      <p className="mt-4 max-w-xl text-body text-paper-tertiary">{ABOUT_ARCHITECTURE_COPY.lead}</p>

      <div ref={rootRef} className="relative mt-16">
        {/* Mobile: vertical progression. */}
        <div className="relative pl-8 sm:hidden">
          <div aria-hidden className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-border-on-ink" />
          <div ref={mobileLineRef} aria-hidden className="absolute top-2 bottom-2 left-2.5 w-0.5 origin-top scale-y-0 bg-primary-on-ink" />
          <ol className="flex flex-col gap-8">
            {ABOUT_ARCHITECTURE_LAYERS.map((layer) => {
              const Icon = CategoryIcon[layer.category];
              return (
                <li key={layer.category} className="relative">
                  <span aria-hidden className="absolute top-0.5 -left-[calc(2rem-3px)] flex h-7 w-7 items-center justify-center rounded-full bg-ink text-primary-on-ink ring-4 ring-surface-olive">
                    <Icon size={14} />
                  </span>
                  <p className="font-mono text-caption-sm text-paper-tertiary uppercase">{layer.category}</p>
                  <p className="mt-1 text-headline-sm text-paper-primary">{layer.title}</p>
                  <p className="mt-1 text-body-sm text-paper-tertiary">{layer.body}</p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Desktop: horizontal progression with a drawn connecting line. */}
        <div className="hidden sm:block">
          <div className="relative mb-10 h-0.5 w-full bg-border-on-ink">
            <div ref={lineRef} aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-primary-on-ink" />
          </div>
          <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT_ARCHITECTURE_LAYERS.map((layer) => {
              const Icon = CategoryIcon[layer.category];
              return (
                <li key={layer.category} className="relative">
                  <span
                    aria-hidden
                    className="absolute -top-[3.35rem] left-0 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-primary-on-ink ring-4 ring-surface-olive"
                  >
                    <Icon size={16} />
                  </span>
                  <p className="font-mono text-caption-sm text-paper-tertiary uppercase">{layer.category}</p>
                  <p className="mt-1 text-headline-sm text-paper-primary">{layer.title}</p>
                  <p className="mt-2 max-w-56 text-body-sm text-paper-tertiary">{layer.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Section>
  );
}
