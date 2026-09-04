import type { ScrollRevealApi } from "@/lib/motion/use-scroll-reveal";

/**
 * FINAL-DESIGN-01A-R3: this module used to also export `fadeUpReveal`/
 * `staggerReveal` - both built on `gsap.fromTo(target, {opacity:0}, {...,
 * scrollTrigger:{once:true}})`, applying the hidden `opacity:0` state
 * synchronously and unconditionally the instant a component mounted,
 * with the ONLY recovery path being that one ScrollTrigger condition
 * firing exactly once. A full-page screenshot capture that never
 * dispatches a real scroll event (or any other cause of a stale/never-
 * satisfied trigger) could leave content stuck invisible forever - the
 * confirmed root cause of a reported blank-content defect (see
 * lib/motion/use-scroll-reveal.ts's doc comment and
 * docs/rebuild/FINAL_DESIGN_01A_R3_*.md).
 *
 * Both are deleted, not deprecated-in-place: every former caller
 * migrated to one of two safer patterns - the CSS-attribute-gated
 * `Reveal` component (components/layout/reveal.tsx) for "supporting
 * sections" (never gates on scroll position at all), or a continuous,
 * non-`once` scrub/toggle (like `drawLine` below) for the "primary
 * narrative" sections that keep GSAP - which rests at a valid, fully-
 * visible-content default with zero JS rather than depending on a
 * one-shot trigger. See test-guards/no-legacy-motion-presets.test.ts for
 * the regression guard against either function's opacity-gating pattern
 * coming back.
 */

/**
 * Grows an SVG path's stroke from 0 to its full length as `trigger`
 * (defaults to the path itself) scrolls through the viewport - the
 * signal-line motif, the experience rail, and the process line all use
 * this. Continuous scrub, never `once`, and the base markup already
 * renders the path fully drawn (see the CSS in globals.css) - GSAP only
 * ever adds the scroll-linked draw-in on top of that, never gates it.
 */
export function drawLine(api: ScrollRevealApi, path: SVGPathElement, trigger?: Element) {
  // getTotalLength() is unimplemented in some test/embedded DOM
  // environments (jsdom included) - skip the draw rather than throw and
  // abort whatever setup() call this is part of.
  let length: number;
  try {
    length = path.getTotalLength();
  } catch {
    return;
  }

  api.gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  api.gsap.to(path, {
    strokeDashoffset: 0,
    ease: "none",
    scrollTrigger: {
      trigger: trigger ?? path,
      start: "top 85%",
      end: api.isMobile ? "top 40%" : "bottom 60%",
      scrub: 0.6,
    },
  });
}
