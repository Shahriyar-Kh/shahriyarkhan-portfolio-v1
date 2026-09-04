"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ImageRevealProps {
  children: ReactNode;
  className?: string;
}

/**
 * Mask-reveal wrapper for hero/story/showcase imagery: the image itself
 * is always in the DOM and always visible in the base (no-JS,
 * reduced-motion, or "observer never fired") state - only once JS has
 * both enhanced the element AND is mid-animation does the CSS in
 * globals.css clip it, so a real photo never depends on a script running
 * to be seen. See the `[data-image-reveal]` rules in globals.css.
 *
 * FINAL-DESIGN-01A-R3 correction (identical reasoning to
 * motif/signal-line.tsx): `data-enhanced` is written only from inside
 * the IntersectionObserver callback, never before it - so if `observe()`
 * succeeds but the callback never fires, nothing is ever marked
 * "enhanced" and the CSS hiding rule never applies.
 */
export function ImageReveal({ children, className }: ImageRevealProps) {
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-image-reveal className={cn("relative overflow-hidden", className)}>
      <div data-reveal-clip className="absolute inset-0">
        <div data-reveal-scale className="relative h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
