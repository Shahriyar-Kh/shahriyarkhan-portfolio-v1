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
 * the warm ivory base every inner page opens on, with an asymmetric
 * portrait frame rather than the homepage's squircle.
 *
 * FINAL-DESIGN-01B-01-R2: two defects an owner recording caught in the
 * previous version are fixed here.
 *
 * 1. "Blank/partial hero" on first navigation. The old entrance used
 *    `.from(el, { opacity: 0, ... })` (and a full clip-path hide on the
 *    portrait) inside useScrollReveal's on-mount effect. That effect
 *    runs *after* the browser has already painted the fully-visible
 *    server HTML, so the sequence a real visitor saw was: visible ->
 *    suddenly hidden -> animate back in - a genuine flash, not a
 *    fail-open animation, regardless of how the "hidden" state was
 *    produced (opacity or clip-path look identical to a viewer). Every
 *    real-content tween below animates `y` (a few px) only - opacity and
 *    clip-path are never applied to headline/meta/lead/CTA text or to
 *    the portrait image, so there is no instant at which any of that
 *    content is actually invisible or clipped away, at any point in the
 *    page's life (no-JS, JS not yet hydrated, GSAP failed to load,
 *    reduced motion, or mid-animation). Only the two purely decorative,
 *    `aria-hidden` elements around the portrait (the depth-plane card
 *    and the signal-line halo, neither of which carries information)
 *    keep an opacity-gated entrance, matching this codebase's
 *    established motion-hierarchy rule (decorative-only opacity/clip
 *    gating; real content never gated).
 * 2. Sticky-header collision. Top padding now reads `--header-h` (the
 *    header's own real measured height, published by site-header.tsx's
 *    ResizeObserver - see that file's doc comment) instead of a static
 *    guess, so there is no breakpoint or font-scaling scenario where the
 *    header's fixed/sticky surface can overlap the hero's first line.
 *
 * Responsive recomposition (also from the same recording): text (eyebrow,
 * headline, lead, CTAs) is now the first element in *source* order at
 * every breakpoint - not just visually first via CSS `order` - so it's
 * the first meaningful thing in the accessibility tree and the first
 * thing painted regardless of CSS/JS. The portrait is capped to a modest
 * width on mobile (never "the complete first viewport"), grows to a
 * compact two-column composition at `md:` (768-1023px, both identity and
 * portrait above the fold), and only reaches its full, previously-
 * approved generous size at `lg:` (1024px+) - the asymmetric frame shape
 * itself is unchanged at every tier.
 */
export function AboutHero({ specialization }: AboutHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const signalRef = useRef<SVGSVGElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
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
      const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.45 } });

      // getTotalLength() is unimplemented in some test/embedded DOM
      // environments (jsdom included) - same guard as hero.tsx. The
      // stroke itself is decorative (a drawn line, no information), so
      // gating it is fine even though real content below is not gated.
      try {
        if (signalPath) {
          const length = signalPath.getTotalLength();
          gsap.set(signalPath, { strokeDasharray: length, strokeDashoffset: length });
          tl.to(signalPath, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" });
        }
      } catch {
        // No-op - see comment above.
      }

      // Decorative-only siblings (aria-hidden, no information) - safe to
      // opacity-gate per this codebase's motion-hierarchy rule.
      if (depthPlaneRef.current) {
        tl.from(depthPlaneRef.current, { x: -10, y: 10, opacity: 0, duration: 0.5 }, "-=0.45");
      }
      if (haloRef.current) {
        tl.from(haloRef.current, { opacity: 0, duration: 0.4 }, "-=0.3");
      }

      // The portrait itself is real content (the owner's photo) - a
      // restrained scale-settle only, never hidden/clipped away.
      if (portraitClipRef.current) {
        tl.from(portraitClipRef.current, { scale: 1.03, duration: 0.6 }, "-=0.5");
      }

      // Real text content: transform-only settle (a few px of `y`),
      // opacity untouched throughout - see the file doc comment.
      tl.from(metaRef.current, { y: 10, duration: 0.4 }, "-=0.35")
        .from(headlineTextRef.current, { y: 16, duration: 0.5 }, "-=0.25")
        .from(leadRef.current, { y: 10, duration: 0.4 }, "-=0.3")
        .from(ctaRef.current ? Array.from(ctaRef.current.children) : [], { y: 10, duration: 0.35, stagger: 0.06 }, "-=0.2");
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

      <div
        className="section-shell relative grid grid-cols-1 gap-y-8 pb-14 sm:pb-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-x-8 md:gap-y-0 md:pb-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-x-16 lg:pb-24"
        style={{ paddingTop: "calc(var(--header-h) + 1.5rem)" }}
      >
        {/* Text - first in DOM order (and therefore first for a screen
            reader, no-JS, or slow-hydration visitor) at every
            breakpoint, placed via explicit grid-column rather than CSS
            `order` so visual order always matches document order. */}
        <div className="md:col-start-1 lg:col-start-1">
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

          <h1 ref={headlineTextRef} className="mt-4 text-display-md text-ink-primary sm:text-display-lg">
            {ABOUT_INTRO.title}
          </h1>

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

        {/* Portrait - second in DOM order. Capped to a modest size on
            mobile (never "the complete first viewport"), a compact size
            at the md: two-column tier, and the full, previously-
            approved generous size only from lg: up. */}
        <div className="mx-auto w-full max-w-52 sm:max-w-60 md:col-start-2 md:mx-0 md:ml-auto md:max-w-56 lg:col-start-2 lg:max-w-sm">
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
                sizes="(min-width: 1024px) 24rem, (min-width: 640px) 15rem, 13rem"
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
      </div>
    </div>
  );
}
