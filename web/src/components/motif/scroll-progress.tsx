"use client";

import { useEffect, useRef } from "react";

/**
 * A Run growing along the viewport's top edge as the user scrolls.
 * Hidden below 768px (see globals.css / P01_MOTION_MAP.md) and under
 * prefers-reduced-motion. Uses rAF-throttled scroll, not a naive
 * per-event listener.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${progress})`;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 right-0 left-0 z-50 hidden h-px origin-left bg-accent motion-reduce:!hidden md:block"
      ref={ref}
      style={{ transform: "scaleX(0)" }}
    />
  );
}
