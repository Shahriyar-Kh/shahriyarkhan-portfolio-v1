import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CornerFrameProps {
  children: ReactNode;
  className?: string;
}

/**
 * The "not-a-card" container device: four L-bracket corner marks instead
 * of a rounded border. Replaces every place the legacy app would have
 * used a rounded card - see the brand direction's anti-template rule
 * ("no container radius above --radius-lg; cards are not the primary
 * organizing device").
 */
export function CornerFrame({ children, className }: CornerFrameProps) {
  return (
    <div className={cn("group/frame relative", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1 -left-1 h-3 w-3 border-t border-l border-accent opacity-70 transition-opacity duration-(--motion-fast) group-hover/frame:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1 -right-1 h-3 w-3 border-t border-r border-accent opacity-70 transition-opacity duration-(--motion-fast) group-hover/frame:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-1 -left-1 h-3 w-3 border-b border-l border-accent opacity-70 transition-opacity duration-(--motion-fast) group-hover/frame:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-1 -right-1 h-3 w-3 border-b border-r border-accent opacity-70 transition-opacity duration-(--motion-fast) group-hover/frame:opacity-100"
      />
      {children}
    </div>
  );
}
