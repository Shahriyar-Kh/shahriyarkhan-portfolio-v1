"use client";

import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

let initialized = false;

/**
 * Recalculates every ScrollTrigger's cached start/end pixel offsets once
 * layout has actually settled - a secondary defense against real-scroll
 * trigger-position drift (font-swap reflow, a lazy-loaded image changing
 * a container's height after ScrollTrigger.create() already measured
 * it). This is NOT the fix for the reported blank-content defect (that's
 * lib/motion/presets.ts/use-scroll-reveal.ts no longer opacity-gating
 * real content on scroll position at all) - refresh() only corrects
 * positions relative to the *current* scroll offset, so it cannot help a
 * capture mode where scrollY never moves from 0 in the first place.
 *
 * Wired once, from gsap-client.ts's getGsap(), regardless of how many
 * components mount - the `initialized` guard mirrors that module's own
 * `registered` flag.
 */
export function initScrollTriggerRefresh(ScrollTrigger: typeof ScrollTriggerType): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  void document.fonts?.ready?.then(() => ScrollTrigger.refresh());

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener(
    "resize",
    () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
    },
    { passive: true },
  );
}
