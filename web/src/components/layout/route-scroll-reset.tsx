"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * FINAL-DESIGN-01D-03-FIX: on every client-side route change, Next.js's
 * own App Router scroll restoration scrolls the *new page segment* (not
 * the shared root layout) to the top of the viewport. SiteHeader is
 * `position: sticky`, a persisting shared segment that still occupies
 * real flow space at scrollY 0 - so "the new segment's top meets the
 * viewport's top" resolves to `scrollY === header height`, not 0, and the
 * sticky header then re-pins over the first ~80px of the destination
 * page's own content. Reproduced on *every* client-side navigation
 * site-wide (plain header nav links included, not just ServiceNav/
 * ProjectNav) - confirmed via a fresh full page load landing at scrollY 0
 * correctly, so this is specifically a client-transition defect, not a
 * layout/padding one.
 *
 * The fix mirrors mobile-nav.tsx's own restore call: an explicit,
 * `behavior: "instant"` scroll-to-0 keyed off `usePathname()` so it can
 * never be caught by `html`'s global `scroll-behavior: smooth` rule
 * (layout.tsx's `data-scroll-behavior="smooth"`), which would otherwise
 * make the correction itself visibly animate. Deliberately keyed on
 * pathname only, not search params - a filter/query-only change on the
 * same route must not reset scroll.
 */
export function RouteScrollReset() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // The initial load is already at the browser's own correct starting
    // position (0, or a hash-target/back-forward restore) - only a
    // genuine subsequent client-side navigation needs the correction.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
