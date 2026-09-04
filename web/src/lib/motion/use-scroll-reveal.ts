"use client";

import { useEffect, type RefObject } from "react";
import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import { getGsap, isMobileViewport } from "@/lib/motion/gsap-client";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export interface ScrollRevealApi {
  gsap: typeof GsapType;
  ScrollTrigger: typeof ScrollTriggerType;
  root: HTMLElement;
  /** True below 768px - every setup callback that changes travel
   * distance, disables pinning, or otherwise lightens the animation for
   * small screens reads this once at setup time. */
  isMobile: boolean;
}

type Setup = (api: ScrollRevealApi) => void;

/**
 * The one hook every GSAP-driven component in this codebase goes
 * through - see docs/rebuild/FINAL_DESIGN_01A_R2_VISUAL_GAP_AUDIT.md for
 * why this replaces scattered inline gsap calls.
 *
 * Guarantees:
 * - Never runs on the server (the effect body itself only executes in
 *   the browser; `getGsap()` inside it is a second, redundant guard).
 * - Never runs under prefers-reduced-motion - `setup` is simply never
 *   called, so a reduced-motion visitor gets the plain server-rendered
 *   markup with zero gsap.set()/animation applied to it at any point.
 * - Everything the `setup` callback creates (tweens, ScrollTriggers,
 *   timelines) is scoped to a gsap.context() rooted at `ref.current` and
 *   reverted on unmount/dep-change, so cleanup is automatic and
 *   exhaustive - no manually-tracked ScrollTrigger.kill() calls that can
 *   be forgotten.
 * - `setup` runs synchronously inside the context callback, so the
 *   window between "content is set to its hidden starting state" and
 *   "a ScrollTrigger exists to bring it back" is a single synchronous
 *   call stack, not a series of awaited steps that a later error could
 *   interrupt.
 */
export function useScrollReveal(ref: RefObject<HTMLElement | null>, setup: Setup, deps: readonly unknown[] = []) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const root = ref.current;
    const mod = getGsap();
    if (!root || !mod) return;

    const { gsap, ScrollTrigger } = mod;
    const ctx = gsap.context(() => setup({ gsap, ScrollTrigger, root, isMobile: isMobileViewport() }), root);

    return () => ctx.revert();
    // `setup` is provided fresh per render by call sites (it closes over
    // props/content) - callers pass their own dependency list instead of
    // relying on the function identity, mirroring useEffect/useCallback
    // conventions elsewhere in this codebase (see Reveal, SignalLine).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, ref, ...deps]);
}
