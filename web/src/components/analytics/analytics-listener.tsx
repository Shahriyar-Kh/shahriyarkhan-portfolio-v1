"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsProps } from "@/lib/analytics";

/**
 * One delegated click listener in the root layout, not N client islands.
 * RSC sections emit plain `<a data-analytics-event="..." data-analytics-*>`
 * attributes with zero JS of their own; this is the only place that
 * reads them. Keyboard Enter on an anchor fires a native click event, so
 * keyboard users are covered without extra handling.
 */
export function AnalyticsListener() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>("[data-analytics-event]");
      if (!el) return;

      const name = el.dataset.analyticsEvent as AnalyticsEventName | undefined;
      if (!name) return;

      const props: Record<string, string> = {};
      for (const [key, value] of Object.entries(el.dataset)) {
        if (key === "analyticsEvent" || !key.startsWith("analytics")) continue;
        const propName = key.slice("analytics".length).replace(/^./, (c) => c.toLowerCase());
        if (value !== undefined) props[propName] = value;
      }

      trackEvent(name, props as AnalyticsProps);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
