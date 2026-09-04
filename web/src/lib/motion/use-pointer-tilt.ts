"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface PointerTiltTarget {
  ref: RefObject<HTMLElement | null>;
  /** Maximum translate in either axis for this specific target - callers
   * pass a smaller value for a background/halo element than for the
   * foreground element so the two read as independently-responding depth
   * planes rather than one rigid unit. */
  maxOffset: number;
}

/**
 * Fine-pointer-only pointer tracking for a small "depth" response across
 * more than one element from a single hover zone (FINAL-DESIGN-01A-R4 §C:
 * hero portrait frame + its signal-line halo respond separately). Same
 * gating/cleanup discipline as lib/motion/use-magnetic-hover.ts (fine
 * pointer + real hover support + motion allowed; always resets on
 * pointer-leave and unmount) but generalized to drive several targets at
 * once, since that hook only ever moves the single element it's attached
 * to.
 *
 * `targets` is read via a ref updated on every render (not a dependency
 * of the effect) so callers can pass an inline array literal each render
 * without re-attaching listeners - the effect only (re)runs when
 * `enabled` changes, and target elements are resolved fresh from their
 * own refs at move-time regardless.
 */
export function usePointerTilt<T extends HTMLElement>(enabled: boolean, targets: readonly PointerTiltTarget[]) {
  const zoneRef = useRef<T>(null);
  const targetsRef = useRef(targets);

  // Refs may only be written outside of render (react-hooks/refs) - this
  // keeps targetsRef current after every commit without making `targets`
  // an effect dependency (see the hook's own doc comment for why that's
  // safe: target elements are always resolved fresh from their own refs
  // at move-time).
  useEffect(() => {
    targetsRef.current = targets;
  });

  useEffect(() => {
    const zone = zoneRef.current;
    if (!enabled || !zone) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function reset() {
      for (const target of targetsRef.current) {
        if (target.ref.current) target.ref.current.style.transform = "";
      }
    }

    function onMove(event: PointerEvent) {
      if (!zone) return;
      const rect = zone.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      for (const target of targetsRef.current) {
        const el = target.ref.current;
        if (!el) continue;
        el.style.transform = `translate(${(nx * 2 * target.maxOffset).toFixed(2)}px, ${(ny * 2 * target.maxOffset).toFixed(2)}px)`;
      }
    }

    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerleave", reset);
    return () => {
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerleave", reset);
      reset();
    };
  }, [enabled]);

  return zoneRef;
}
