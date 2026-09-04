"use client";

import Image from "next/image";
import { useRef } from "react";
import { SignalLine } from "@/components/motif/signal-line";
import { RoleRotator } from "@/components/sections/role-rotator";
import { Button } from "@/components/ui/button";
import { HERO_COPY, HERO_ROLES } from "@/content/home";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { usePointerTilt } from "@/lib/motion/use-pointer-tilt";

/** Splits HERO_COPY.lead so its verified opening claim ("Python and
 * Django") can carry a restrained color-sweep without hand-writing a
 * second, drifting copy of the sentence - if the copy ever stops
 * starting with this phrase the split just no-ops to the plain string,
 * so a future copy edit can't silently orphan a highlight around the
 * wrong words. */
function splitLeadForSweep(lead: string): [string, string] {
  const phrase = "Python and Django";
  return lead.startsWith(phrase) ? [phrase, lead.slice(phrase.length)] : ["", lead];
}

/**
 * Section A - cinematic ink-band masthead. The one full-bleed dark
 * section at the top of the page (see globals.css's `surface-ink`
 * utility) - everything else on the homepage sits on the warm ivory
 * base, so this is where the header's transparent-to-solid crossover
 * (site-header.tsx) actually happens.
 *
 * Layout is a single grid with per-element `order` (mobile) vs. explicit
 * column/row placement (`lg:`) - NOT two parallel mobile/desktop DOM
 * trees - so there is exactly one <h1>, one portrait, one CTA row in the
 * document at every width. That single-tree constraint is also what
 * keeps the R1 mobile bug from recurring: the portrait sits at
 * mobile order-3 (right after the headline, before role/lead/CTAs), so
 * it is part of the first thing a phone visitor sees rather than a
 * reward for scrolling past the full text stack (see the R2 visual-gap
 * audit's mobile-gaps section for how R1 got this wrong).
 */
export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const signalRef = useRef<SVGSVGElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const headlineClipRef = useRef<HTMLDivElement>(null);
  const headlineTextRef = useRef<HTMLHeadingElement>(null);
  const roleRef = useRef<HTMLParagraphElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const portraitClipRef = useRef<HTMLDivElement>(null);
  const depthPlaneRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const [leadSweep, leadRest] = splitLeadForSweep(HERO_COPY.lead);

  // Portrait frame + halo respond independently to the pointer, each
  // within its own small max offset - fine-pointer/hover-capable/motion-
  // allowed only, reset on leave (lib/motion/use-pointer-tilt.ts).
  const tiltZoneRef = usePointerTilt<HTMLDivElement>(true, [
    { ref: portraitClipRef, maxOffset: 3 },
    { ref: haloRef, maxOffset: 1.5 },
  ]);

  // The first-load staged sequence (brief §4): signal draws, then
  // availability, then the headline unmasks line-by-line, then role,
  // lead, CTAs, and finally the portrait's own mask/depth reveal. This
  // plays once on mount - it is not scroll-triggered, since the hero is
  // already the first thing in the viewport. Every element it touches
  // renders fully visible in the base HTML; gsap.set() only ever hides
  // something in the same synchronous call that also schedules the tween
  // bringing it back, so a script error elsewhere can't strand anything
  // in a hidden state.
  useScrollReveal(rootRef, ({ gsap }) => {
    const signalPath = signalRef.current?.querySelector("path");
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // getTotalLength() is unimplemented in some test/embedded DOM
    // environments (jsdom included) - guarded the same way canvas
    // getContext() already is elsewhere in this app, so a missing
    // implementation just skips the line-draw and lets the rest of the
    // sequence play, rather than throwing and aborting the whole timeline.
    try {
      if (signalPath) {
        const length = signalPath.getTotalLength();
        gsap.set(signalPath, { strokeDasharray: length, strokeDashoffset: length });
        tl.to(signalPath, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" });
      }
    } catch {
      // No-op - see comment above.
    }

    tl.from(metaRef.current, { opacity: 0, y: 10, duration: 0.5 }, "-=0.5")
      .from(headlineTextRef.current, { yPercent: 110, opacity: 0, duration: 0.7 }, "-=0.25")
      .from(roleRef.current, { opacity: 0, y: 12, duration: 0.5 }, "-=0.3")
      .addLabel("lead")
      .from(leadRef.current, { opacity: 0, y: 12, duration: 0.5 }, "-=0.35")
      .from(ctaRef.current ? Array.from(ctaRef.current.children) : [], { opacity: 0, y: 14, duration: 0.45, stagger: 0.08 }, "-=0.3");

    if (portraitClipRef.current) {
      tl.fromTo(portraitClipRef.current, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "power2.inOut" }, "-=0.5");
    }
    if (depthPlaneRef.current) {
      tl.from(depthPlaneRef.current, { x: 16, y: 16, opacity: 0, duration: 0.7 }, "-=0.7");
    }

    // Positioned at the "lead" label (concurrent with the lead paragraph's
    // own fade-in), not appended to the end of the chain - it finishes
    // well before the portrait reveal regardless, so it adds no extra
    // wait before the hero's largest content becomes visible. Starts
    // off-gradient (200% 0) and settles at the CSS-authored resting
    // position (0% 0, the default in the JSX below), so if this never
    // runs (no-JS, reduced motion, an earlier error) the phrase is still
    // fully legible at its settled tint - same fail-open shape as every
    // other tween in this sequence.
    if (sweepRef.current) {
      tl.from(sweepRef.current, { backgroundPosition: "200% 0", duration: 1.1, ease: "power2.out" }, "lead");
    }
  }, []);

  return (
    <div ref={rootRef} className="surface-ink relative overflow-hidden">
      {/* Atmosphere: a faint architectural grid plus one warm radial
       * light, both purely decorative (aria-hidden, pointer-events-none,
       * static CSS - no image asset, no video, no WebGL). The signal-line
       * path atmosphere element is the existing `flow` line below. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border-on-ink) 1px, transparent 1px), linear-gradient(90deg, var(--border-on-ink) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-136 w-136 rounded-full opacity-25 blur-[110px] sm:h-168 sm:w-2xl"
        style={{ backgroundColor: "var(--primary)" }}
      />

      <SignalLine
        variant="flow"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-40 sm:h-32"
      />

      <div className="section-shell relative grid grid-cols-1 gap-y-7 pt-10 pb-14 sm:pt-14 sm:pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-x-16 lg:gap-y-0 lg:pt-36 lg:pb-28">
        {/* Step 1/2: signal + availability - order-1 everywhere, so it's
            always the very first thing rendered, mobile included. */}
        <div ref={metaRef} className="order-1 lg:order-0 lg:col-start-1 flex flex-wrap items-center gap-x-5 gap-y-2">
          <svg ref={signalRef} viewBox="0 0 96 24" className="h-4 w-20 text-primary-on-ink" aria-hidden focusable="false">
            <path
              d="M2 20 L22 20 L22 8 L44 8 L44 16 L94 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="square"
            />
            <circle cx={94} cy={16} r={3.5} className="fill-primary-on-ink" />
          </svg>
          <span className="inline-flex items-center gap-2 font-mono text-caption text-paper-secondary">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-on-ink" />
            Available for new work
          </span>
          <span className="font-mono text-caption text-paper-tertiary">Islamabad, Pakistan</span>
        </div>

        {/* Step 3: headline, mask-revealed by line. */}
        <div ref={headlineClipRef} className="order-2 lg:order-0 lg:col-start-1 mt-3 overflow-hidden">
          <h1 ref={headlineTextRef} className="text-display-lg text-paper-primary sm:text-display-xl">
            {HERO_COPY.title}
          </h1>
        </div>

        {/* Portrait composition - order-3 on mobile (right after the
            headline, before role/lead/CTAs) so it's part of the first
            meaningful viewport; explicit lg: placement floats it into
            its own column spanning every row on desktop. */}
        <div className="order-3 lg:order-0 lg:col-start-2 lg:row-span-6 lg:row-start-1 mx-auto mt-2 w-full max-w-60 sm:max-w-xs lg:mx-0 lg:mt-0 lg:max-w-sm">
          {/* Architectural squircle, not a circle: 24px on three corners
           * plus one 56px "signature" curve (top-right, echoing the SK
           * mark's own right-angle-into-curve idiom) rather than a
           * uniform radius. Three layered depth planes - a thin
           * accent-colored outline (offset up-left), a solid ink card
           * (offset down-right, the existing GSAP-animated depthPlaneRef),
           * and the portrait itself in front - plus a small signal-line
           * halo, both of which tilt a couple of px independently on
           * fine-pointer hover via usePointerTilt. */}
          <div ref={tiltZoneRef} className="relative">
            <div
              ref={haloRef}
              data-hero-portrait-halo
              aria-hidden
              className="pointer-events-none absolute -top-7 -left-7 h-16 w-16 opacity-45 sm:-top-9 sm:-left-9 sm:h-20 sm:w-20"
            >
              <SignalLine variant="rise" pulses={1} className="h-full w-full" />
            </div>

            <div
              aria-hidden
              className="absolute -top-3 -left-3 h-full w-full rounded-tl-3xl rounded-tr-[3.5rem] rounded-br-3xl rounded-bl-3xl border-2 border-primary-on-ink/40 sm:-top-4 sm:-left-4"
            />
            <div
              ref={depthPlaneRef}
              aria-hidden
              className="absolute -right-3 -bottom-3 h-full w-full rounded-tl-3xl rounded-tr-[3.5rem] rounded-br-3xl rounded-bl-3xl border border-border-on-ink bg-ink-raised sm:-right-4 sm:-bottom-4"
            />
            <div
              ref={portraitClipRef}
              className="relative aspect-4/5 w-full overflow-hidden rounded-tl-3xl rounded-tr-[3.5rem] rounded-br-3xl rounded-bl-3xl bg-ink-raised"
            >
              <Image
                src="/images/profile.png"
                alt="Portrait of Shahriyar Khan"
                fill
                priority
                unoptimized
                sizes="(min-width: 1024px) 24rem, (min-width: 640px) 20rem, 15rem"
                className="object-cover object-[center_15%]"
              />
              {/* Subtle inner highlight - a soft top-edge light catch, not
               * a glossy overlay. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ boxShadow: "inset 0 1px 0 rgba(250,246,238,0.14), inset 0 0 0 1px rgba(250,246,238,0.06)" }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-ink/80 px-3 py-2 backdrop-blur-sm">
                <span aria-hidden className="h-px w-4 bg-primary-on-ink" />
                <p className="font-mono text-caption-sm text-paper-secondary">Python · Django · React</p>
              </div>
            </div>
          </div>
        </div>

        <p ref={roleRef} className="order-4 lg:order-0 lg:col-start-1 mt-4 text-headline-md text-paper-secondary" aria-live="off">
          <RoleRotator roles={HERO_ROLES} />
        </p>
        <p ref={leadRef} className="order-5 lg:order-0 lg:col-start-1 mt-5 max-w-xl text-body-lg text-paper-secondary">
          {leadSweep && (
            <span
              ref={sweepRef}
              className="bg-[linear-gradient(100deg,var(--paper-primary)_0%,var(--primary-on-ink)_45%,var(--paper-primary)_85%)] bg-size-[250%_100%] bg-position-[0%_0] bg-clip-text text-transparent"
            >
              {leadSweep}
            </span>
          )}
          {leadRest}
        </p>

        <div ref={ctaRef} className="order-6 lg:order-0 lg:col-start-1 mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          <Button href={HERO_COPY.primaryCta.href} variant="primary-on-ink" size="lg" className="col-span-2 sm:col-auto" data-analytics-event="recruiter_cta_click">
            {HERO_COPY.primaryCta.label}
          </Button>
          <Button href={HERO_COPY.secondaryCta.href} variant="secondary-on-ink" size="lg" className="col-span-2 sm:col-auto" data-analytics-event="project_cta_click">
            {HERO_COPY.secondaryCta.label}
          </Button>
        </div>

        <div className="order-7 lg:order-0 lg:col-start-1 mt-6">
          <a href="/resume" className="text-body-sm text-paper-secondary underline-offset-4 hover:text-paper-primary hover:underline">
            View résumé →
          </a>
        </div>
      </div>
    </div>
  );
}
