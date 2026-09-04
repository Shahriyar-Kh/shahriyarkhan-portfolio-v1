"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface SystemMapActivationProps {
  children: ReactNode;
}

/**
 * The only client-side JS in the signature scroll-driven experience
 * (~30 lines). Sets data-enhanced after mount, then data-active on the
 * first IntersectionObserver hit (fires once, then unobserves - no
 * scrub, no reverse). All actual animation lives in CSS (globals.css),
 * scoped so it can only ever hide something under
 * (prefers-reduced-motion: no-preference) AND [data-enhanced="true"].
 */
export function SystemMapActivation({ children }: SystemMapActivationProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute("data-enhanced", "true");

    if (!("IntersectionObserver" in window)) {
      el.setAttribute("data-active", "true");
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.setAttribute("data-active", "true");
        io.unobserve(entry.target);
      },
      { threshold: 0.35, rootMargin: "0px 0px -10% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
