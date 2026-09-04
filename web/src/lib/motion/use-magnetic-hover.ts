"use client";

import { useEffect, useRef } from "react";

/** Maximum travel in either axis - "small," per the brief, not a
 * dramatic drag effect. */
const MAX_OFFSET_PX = 6;
/** How strongly the element follows the pointer within its own bounds -
 * well under 1 so it reads as a subtle pull, not 1:1 tracking. */
const STRENGTH = 0.25;

/**
 * A restrained magnetic pointer-follow for primary CTAs
 * (FINAL-DESIGN-01A-R3 §Motion Direction: "CTAs: small magnetic or
 * directional response only on fine pointers"). Deliberately NOT built
 * on GSAP/ScrollTrigger - this is a pure hover/pointer interaction with
 * no scroll dependency whatsoever, so it carries none of the fail-open
 * risk the rest of this pass addressed. Attaches its own listeners only
 * when a fine pointer with real hover support is present and motion is
 * allowed; always resets to no offset on pointer-leave and on unmount.
 */
export function useMagneticHover<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onMove(event: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      const x = Math.max(-MAX_OFFSET_PX, Math.min(MAX_OFFSET_PX, offsetX * STRENGTH));
      const y = Math.max(-MAX_OFFSET_PX, Math.min(MAX_OFFSET_PX, offsetY * STRENGTH));
      el.style.transform = `translate(${x}px, ${y}px)`;
    }
    function onLeave() {
      if (el) el.style.transform = "";
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    };
  }, [enabled]);

  return ref;
}
