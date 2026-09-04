"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface SignalLineProps {
  /** "flow" is a loose horizontal wave (hero/section transitions). "rise"
   * is a short diagonal climb (CTA/stat accents). Both read as the same
   * family of mark, never a grid or diagram. */
  variant?: "flow" | "rise";
  pulses?: 1 | 2 | 3;
  className?: string;
}

const PATHS: Record<NonNullable<SignalLineProps["variant"]>, { d: string; viewBox: string; pulsePoints: [number, number][] }> = {
  flow: {
    viewBox: "0 0 480 64",
    d: "M0 48 C 60 48, 60 16, 120 16 S 200 48, 260 48 S 340 12, 400 12 S 460 40, 480 40",
    pulsePoints: [
      [120, 16],
      [260, 48],
      [400, 12],
    ],
  },
  rise: {
    viewBox: "0 0 160 96",
    d: "M4 92 L 52 92 L 52 52 L 100 52 L 100 16 L 156 16",
    pulsePoints: [
      [52, 52],
      [100, 16],
    ],
  },
};

/**
 * The reusable draw-on-scroll signal line - the site's one signature
 * motion device, used instead of the retired connector/system-map
 * diagram as the primary brand identity. Base markup (no data attributes
 * yet) renders the path fully drawn and every pulse fully opaque; the
 * hide-then-draw behavior is applied entirely by the CSS in globals.css
 * under `[data-enhanced="true"]`, gated the same fail-open way as the
 * legacy system-map: JS disabled, reduced motion, or an observer that
 * never fires all leave the mark completely visible.
 *
 * FINAL-DESIGN-01A-R3 correction: `data-enhanced` is written only from
 * inside the IntersectionObserver's own callback, never before/outside
 * it. Writing it eagerly (the R2 behavior) meant that if `observe()`
 * succeeded but the callback simply never fired - a real, named failure
 * mode - the element would be marked "enhanced" with no path ever
 * setting "active", stranding it hidden forever. Now: the callback
 * firing at all is the proof the observer works, and on that same first
 * firing we either reveal immediately (already intersecting) or enter
 * the "watch for it" hidden state (not yet intersecting) - never both
 * "enhanced" and "unproven" at once.
 */
export function SignalLine({ variant = "flow", pulses = 3, className }: SignalLineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const path = PATHS[variant];
  const shownPulses = path.pulsePoints.slice(0, pulses);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (!("IntersectionObserver" in window)) {
      el.dataset.enhanced = "true";
      el.dataset.active = "true";
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          el.dataset.enhanced = "true";
          el.dataset.active = "true";
          io.unobserve(entry.target);
        } else {
          el.dataset.enhanced = "true";
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-signal-line className={cn("text-primary", className)}>
      <svg viewBox={path.viewBox} className="h-full w-full" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-draw pathLength={1} d={path.d} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {shownPulses.map(([x, y], i) => (
          <circle key={`${x}-${y}`} data-pulse data-pulse-index={String(i + 1)} cx={x} cy={y} r={5} fill="currentColor" />
        ))}
      </svg>
    </div>
  );
}
