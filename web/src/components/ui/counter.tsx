"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export interface CounterProps {
  /** The real, already-computed value (a `.length` on live API data,
   * never an invented figure) - see proof-strip.tsx, the only caller. */
  value: number;
  durationMs?: number;
  className?: string;
  /**
   * FINAL-DESIGN-01B-01-R2: when a caller can't guarantee this element
   * sits below the fold (so the count-up's `setDisplay(0)` reset would
   * be the very first thing a visitor sees - a real value flashing to a
   * misleading "0" or "1"), pass `animate={false}` to render the real
   * value as static text and skip the IntersectionObserver entirely.
   * Defaults to true so the homepage's existing, approved proof strip is
   * unaffected.
   */
  animate?: boolean;
}

/**
 * Counts up from 0 to a real integer once scrolled into view. Renders
 * the final value immediately - never 0 - under reduced motion, without
 * IntersectionObserver support, or before JS has run (the server-
 * rendered markup already contains the target number as plain text).
 */
export function Counter({ value, durationMs = 900, className, animate = true }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!animate || reducedMotion || started) return;
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.unobserve(entry.target);
        setStarted(true);

        const start = performance.now();
        setDisplay(0);

        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(1, elapsed / durationMs);
          const eased = 1 - (1 - progress) * (1 - progress);
          setDisplay(Math.round(value * eased));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animate, reducedMotion, started, value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
