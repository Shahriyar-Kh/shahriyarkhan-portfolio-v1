"use client";

import Image from "next/image";
import { useRef } from "react";
import { SignalLine } from "@/components/motif/signal-line";
import { Button } from "@/components/ui/button";
import { ABOUT_HERO_EYEBROW, ABOUT_HERO_META, ABOUT_INTRO, ABOUT_SPECIALIZATION_FALLBACK } from "@/content/about";
import { usePointerTilt } from "@/lib/motion/use-pointer-tilt";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

export interface AboutHeroProps {
  /** Prefers the live SiteSetting.hero_subtitle - see content/about.ts's
   * ABOUT_SPECIALIZATION_FALLBACK doc comment for why. */
  specialization: string | null;
}

/**
 * FINAL-DESIGN-01B-01 Section A - the premium /about masthead. A
 * deliberately different composition from the homepage's ink-band Hero
 * (sections/hero.tsx, locked/approved and untouched): this one sits on
 * the warm ivory base every inner page opens on (see site-header.tsx's
 * own doc comment on why every inner page must open on paper, never
 * ink), with the portrait on the left in an upright card rather than
 * the homepage's right-column squircle - so /about reads as its own
 * page, not a re-run of the homepage hero.
 *
 * Entrance is a staged GSAP sequence on mount (not scroll-triggered -
 * this is the first thing in the viewport), matching hero.tsx's own
 * fail-open shape exactly: every element renders fully visible in the
 * base HTML, and gsap.set() only ever hides something in the same
 * synchronous call that also schedules the tween bringing it back.
 */
export function AboutHero({ specialization }: AboutHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const signalRef = useRef<SVGSVGElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const headlineClipRef = useRef<HTMLDivElement>(null);
  const headlineTextRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const portraitClipRef = useRef<HTMLDivElement>(null);
  const depthPlaneRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  const tiltZoneRef = usePointerTilt<HTMLDivElement>(true, [
    { ref: portraitClipRef, maxOffset: 3 },
    { ref: haloRef, maxOffset: 1.5 },
  ]);

  useScrollReveal(
    rootRef,
    ({ gsap }) => {
      const signalPath = signalRef.current?.querySelector("path");
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // getTotalLength() is unimplemented in some test/embedded DOM
      // environments (jsdom included) - same guard as hero.tsx.
      try {
        if (signalPath) {
          const length = signalPath.getTotalLength();
          gsap.set(signalPath, { strokeDasharray: length, strokeDashoffset: length });
          tl.to(signalPath, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" });
        }
      } catch {
        // No-op - see comment above.
      }

      if (portraitClipRef.current) {
        tl.fromTo(
          portraitClipRef.current,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power2.inOut" },
          "-=0.5",
        );
      }
      if (depthPlaneRef.current) {
        tl.from(depthPlaneRef.current, { x: -14, y: 14, opacity: 0, duration: 0.6 }, "-=0.7");
      }

      tl.from(metaRef.current, { opacity: 0, y: 10, duration: 0.5 }, "-=0.55")
        .from(headlineTextRef.current, { yPercent: 110, opacity: 0, duration: 0.65 }, "-=0.3")
        .from(leadRef.current, { opacity: 0, y: 12, duration: 0.5 }, "-=0.3")
        .from(ctaRef.current ? Array.from(ctaRef.current.children) : [], { opacity: 0, y: 12, duration: 0.4, stagger: 0.08 }, "-=0.25");
    },
    [],
  );

  return (
    <div ref={rootRef} className="relative overflow-hidden bg-paper-raised">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-20 blur-[100px]"
        style={{ backgroundColor: "var(--olive)" }}
      />

      <div className="section-shell relative grid grid-cols-1 gap-y-8 pt-24 pb-16 sm:pt-28 sm:pb-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-x-16 lg:gap-y-0 lg:pt-32 lg:pb-24">
        {/* Portrait - order-1 on mobile, so it's part of the first
            meaningful viewport rather than a reward for scrolling. */}
        <div className="order-1 lg:order-2 lg:col-start-2 mx-auto w-full max-w-72 sm:max-w-xs lg:mx-0 lg:ml-auto lg:max-w-sm">
          <div ref={tiltZoneRef} className="relative">
            <div
              ref={haloRef}
              aria-hidden
              className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 opacity-40 sm:-top-8 sm:-right-8 sm:h-20 sm:w-20"
            >
              <SignalLine variant="rise" pulses={1} className="h-full w-full text-clay" />
            </div>
            <div
              aria-hidden
              className="absolute -top-3 -right-3 h-full w-full rounded-tl-3xl rounded-tr-sm rounded-br-3xl rounded-bl-3xl border-2 border-primary/50 sm:-top-4 sm:-right-4"
            />
            <div
              ref={depthPlaneRef}
              aria-hidden
              className="absolute -bottom-3 -left-3 h-full w-full rounded-tl-3xl rounded-tr-sm rounded-br-3xl rounded-bl-3xl border border-border bg-paper sm:-bottom-4 sm:-left-4"
            />
            <div
              ref={portraitClipRef}
              className="relative aspect-4/5 w-full overflow-hidden rounded-tl-3xl rounded-tr-sm rounded-br-3xl rounded-bl-3xl bg-paper-sunken"
            >
              <Image
                src="/images/profile.png"
                alt="Portrait of Shahriyar Khan"
                fill
                unoptimized
                sizes="(min-width: 1024px) 24rem, (min-width: 640px) 20rem, 18rem"
                className="object-cover object-[center_15%]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ boxShadow: "inset 0 1px 0 rgba(23,19,15,0.06), inset 0 0 0 1px rgba(23,19,15,0.04)" }}
              />
            </div>
          </div>
        </div>

        <div className="order-2 lg:order-1 lg:col-start-1">
          <div ref={metaRef} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <svg ref={signalRef} viewBox="0 0 96 24" className="h-4 w-20 text-primary" aria-hidden focusable="false">
              <path d="M2 20 L22 20 L22 8 L44 8 L44 16 L94 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" />
              <circle cx={94} cy={16} r={3.5} className="fill-primary" />
            </svg>
            <span className="font-mono text-caption text-ink-tertiary uppercase">{ABOUT_HERO_EYEBROW}</span>
            <span className="inline-flex items-center gap-2 font-mono text-caption text-ink-tertiary">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
              {ABOUT_HERO_META.availability}
            </span>
            <span className="font-mono text-caption text-ink-hint">{ABOUT_HERO_META.location}</span>
          </div>

          <div ref={headlineClipRef} className="mt-4 overflow-hidden">
            <h1 ref={headlineTextRef} className="text-display-md text-ink-primary sm:text-display-lg">
              {ABOUT_INTRO.title}
            </h1>
          </div>

          <p ref={leadRef} className="mt-5 max-w-xl text-body-lg text-ink-secondary">
            {specialization || ABOUT_SPECIALIZATION_FALLBACK}
          </p>

          <div ref={ctaRef} className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
            <Button href="/resume" variant="primary" size="lg" className="col-span-2 sm:col-auto" data-analytics-event="resume_view">
              View résumé
            </Button>
            <Button href="/work" variant="secondary" size="lg" className="col-span-2 sm:col-auto" data-analytics-event="project_cta_click">
              See the work
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
