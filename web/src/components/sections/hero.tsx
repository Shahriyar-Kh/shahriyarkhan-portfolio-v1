"use client";

import Image from "next/image";
import { useRef } from "react";
import { SkMark } from "@/components/motif/sk-mark";
import { RoleRotator } from "@/components/sections/role-rotator";
import { Button } from "@/components/ui/button";
import { HERO_COPY, HERO_ROLES } from "@/content/home";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { usePointerTilt } from "@/lib/motion/use-pointer-tilt";

/** Splits HERO_COPY.lead so its verified opening claim ("Python/Django")
 * can carry a restrained color-sweep without hand-writing a
 * second, drifting copy of the sentence - if the copy ever stops
 * starting with this phrase the split just no-ops to the plain string,
 * so a future copy edit can't silently orphan a highlight around the
 * wrong words. */
function splitLeadForSweep(lead: string): [string, string] {
  const phrase = "Python/Django";
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
 * keeps the mobile bug from recurring: the portrait sits at
 * mobile order-3 (right after the headline, before role/lead/CTAs), so
 * it is part of the first thing a phone visitor sees rather than a
 * reward for scrolling past the full text stack.
 */
export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const headlineClipRef = useRef<HTMLDivElement>(null);
  const headlineTextRef = useRef<HTMLHeadingElement>(null);
  const roleRef = useRef<HTMLParagraphElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const portraitClipRef = useRef<HTMLDivElement>(null);
  const depthPlaneRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const [leadSweep, leadRest] = splitLeadForSweep(HERO_COPY.lead);

  // Portrait frame responds to the pointer with restrained tilt -
  // fine-pointer/hover-capable/motion-allowed only, reset on leave.
  const tiltZoneRef = usePointerTilt<HTMLDivElement>(true, [
    { ref: portraitClipRef, maxOffset: 2.5 },
  ]);

  // First-load staged reveal: availability, headline unmasks, role, lead, CTAs,
  // and the portrait card. Fully fails open if JS or motion is disabled.
  useScrollReveal(rootRef, ({ gsap }) => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(metaRef.current, { opacity: 0, y: 10, duration: 0.5 })
      .from(headlineTextRef.current, { yPercent: 110, opacity: 0, duration: 0.7 }, "-=0.25")
      .from(roleRef.current, { opacity: 0, y: 12, duration: 0.5 }, "-=0.3")
      .addLabel("lead")
      .from(leadRef.current, { opacity: 0, y: 12, duration: 0.5 }, "-=0.35")
      .from(ctaRef.current ? Array.from(ctaRef.current.children) : [], { opacity: 0, y: 14, duration: 0.45, stagger: 0.08 }, "-=0.3");

    if (portraitClipRef.current) {
      tl.fromTo(portraitClipRef.current, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "power2.inOut" }, "-=0.5");
    }
    if (depthPlaneRef.current) {
      tl.from(depthPlaneRef.current, { scale: 0.96, opacity: 0, duration: 0.7 }, "-=0.7");
    }

    if (sweepRef.current) {
      tl.from(sweepRef.current, { backgroundPosition: "200% 0", duration: 1.1, ease: "power2.out" }, "lead");
    }
  }, []);

  return (
    <div ref={rootRef} className="surface-ink relative overflow-hidden">
      {/* Atmosphere: architectural grid + warm radial light */}
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border-on-ink/60 to-transparent"
      />

      <div className="section-shell relative grid grid-cols-1 gap-y-7 pt-10 pb-14 sm:pt-14 sm:pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-x-16 lg:gap-y-0 lg:pt-36 lg:pb-28">
        {/* Availability row - clean micro-brand accent & pulsing live dot */}
        <div ref={metaRef} className="order-1 lg:order-0 lg:col-start-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <SkMark tone="on-ink" className="h-4 w-auto text-primary-on-ink" />
            <span className="h-3 w-px bg-border-on-ink/80" aria-hidden />
            <span className="inline-flex items-center gap-2 font-mono text-caption text-paper-secondary">
              <span aria-hidden className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-on-ink opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-on-ink" />
              </span>
              Open to new roles & selected projects
            </span>
          </div>
          <span className="font-mono text-caption text-paper-tertiary">Pakistan · Remote internationally</span>
        </div>

        {/* Headline */}
        <div ref={headlineClipRef} className="order-2 lg:order-0 lg:col-start-1 mt-3 overflow-hidden">
          <h1 ref={headlineTextRef} className="text-display-lg text-paper-primary sm:text-display-xl">
            {HERO_COPY.title}
          </h1>
        </div>

        {/* Refined Portrait Card */}
        <div className="order-3 lg:order-0 lg:col-start-2 lg:row-span-6 lg:row-start-1 mx-auto mt-2 w-full max-w-64 sm:max-w-xs lg:mx-0 lg:mt-0 lg:max-w-sm">
          <div ref={tiltZoneRef} className="relative group">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary-on-ink/25 via-transparent to-primary-on-ink/10 blur-sm opacity-60 transition-opacity duration-500 group-hover:opacity-90"
            />

            <div
              ref={depthPlaneRef}
              className="relative rounded-2xl border border-border-on-ink/90 bg-ink-raised p-2 sm:p-2.5 shadow-2xl shadow-black/70"
            >
              <div
                ref={portraitClipRef}
                className="relative aspect-4/5 w-full overflow-hidden rounded-xl border border-primary-on-ink/20 bg-ink"
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
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent"
                  style={{ boxShadow: "inset 0 1px 0 rgba(250,246,238,0.14), inset 0 0 0 1px rgba(250,246,238,0.06)" }}
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-border-on-ink/60 bg-ink/85 px-3.5 py-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-on-ink" />
                    <p className="font-mono text-caption-sm text-paper-secondary">Python · Django · PostgreSQL</p>
                  </div>
                  <SkMark tone="on-ink" className="h-3 w-auto opacity-75" />
                </div>
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
