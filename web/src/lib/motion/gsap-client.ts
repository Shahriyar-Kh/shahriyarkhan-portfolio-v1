"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initScrollTriggerRefresh } from "@/lib/motion/refresh-on-settle";

let registered = false;

/**
 * The single place gsap/ScrollTrigger are imported and registered.
 * Every other module reaches gsap through this function, never through a
 * direct `import { gsap } from "gsap"` - that keeps plugin registration
 * to exactly once, and keeps every call site guarded against SSR: this
 * file itself is safe to import from a Server Component (the gsap core
 * module has no DOM dependency at import time), but `getGsap()` returns
 * null on the server so nothing in this codebase ever calls a gsap
 * method outside the browser.
 */
export function getGsap() {
  if (typeof window === "undefined") return null;
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    initScrollTriggerRefresh(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

/** True below the tablet breakpoint - callers use this to request
 * shorter travel distances / disable pinning, per the brief's "mobile
 * receives lighter transformations" rule. Re-read on demand rather than
 * cached, since it's only ever called once per gsap.context setup. */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}
