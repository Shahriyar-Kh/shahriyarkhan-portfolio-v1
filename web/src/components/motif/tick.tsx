import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TickProps {
  children: ReactNode;
  className?: string;
}

/** A perpendicular annotation mark + mono label - used for dates,
 * locations, and other short factual annotations (never decoration). */
export function Tick({ children, className }: TickProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs text-ink-tertiary", className)}>
      <span aria-hidden className="h-2 w-px bg-current" />
      {children}
    </span>
  );
}
