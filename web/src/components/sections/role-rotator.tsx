"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export interface RoleRotatorProps {
  roles: readonly string[];
}

const INTERVAL_MS = 2600;

/**
 * The one repeating timer on the site (see the brand direction's
 * anti-template rule against idle/decorative animation - this is the
 * single, deliberate exception, and it carries real information). Pauses
 * when the tab is hidden. Under reduced motion, or with JS disabled,
 * restructures to a static comma-separated list rather than "animation
 * off" - a full content restructure, per the motion research.
 */
export function RoleRotator({ roles }: RoleRotatorProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion || roles.length <= 1) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      timer = setInterval(() => setIndex((i) => (i + 1) % roles.length), INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion, roles.length]);

  if (reducedMotion) {
    return <span>{roles.join(" · ")}</span>;
  }

  return (
    <span key={index} className="inline-block animate-[fade-in_0.4s_ease-out]">
      {roles[index]}
    </span>
  );
}
