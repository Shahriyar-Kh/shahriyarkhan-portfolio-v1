"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms, capped at 4 staggered children per the motion
   * budget in docs/rebuild/P01_MOTION_MAP.md. */
  delay?: number;
  className?: string;
}

/**
 * Shared reveal-on-scroll wrapper - the default primitive for every
 * "supporting section" on the homepage (FINAL-DESIGN-01A-R3 §A.2 retires
 * GSAP opacity-gating for exactly these sections in favor of this
 * component). Base render is always fully visible; hiding is expressed
 * purely in CSS under `[data-reveal][data-enhanced="true"]:not([data-active])`
 * (see globals.css), mirroring motif/signal-line.tsx and
 * motif/image-reveal.tsx exactly.
 *
 * `data-enhanced` is written only from inside the IntersectionObserver's
 * own callback, never before/outside it: if `observe()` succeeds but the
 * callback never fires (a named failure mode), nothing is ever marked
 * "enhanced" and the CSS hiding rule never applies - the base fully-
 * visible render stands forever. On the first callback firing, an
 * already-intersecting element is enhanced and activated in the same
 * tick (no visible hidden frame); a not-yet-intersecting element is only
 * then marked enhanced, and the observer keeps watching (not unobserved)
 * until a later callback reports intersecting and reveals it.
 *
 * A keyboard user tabbing into a child before it has revealed must see
 * it immediately - onFocusCapture force-activates directly via the same
 * DOM-mutation path, independent of the observer.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      onFocusCapture={() => {
        const el = ref.current;
        if (el) {
          el.dataset.enhanced = "true";
          el.dataset.active = "true";
        }
      }}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("transition-[opacity,transform] duration-(--motion-base) ease-(--ease-out)", className)}
    >
      {children}
    </div>
  );
}
