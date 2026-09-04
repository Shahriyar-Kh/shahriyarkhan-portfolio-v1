import { cn } from "@/lib/cn";

export interface NodeProps {
  /** Filled = verified/active. Hollow = inferred/inactive. This is the
   * same visual vocabulary the claim register uses (see
   * components/work/claim-badge.tsx) - the motif and the truth
   * discipline are the same system. */
  filled?: boolean;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}

/** The 6x6px square primitive. Pure SVG, no filters, no gradients. */
export function Node({ filled = false, size = 6, className, ...rest }: NodeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 6 6"
      className={cn("shrink-0", className)}
      aria-hidden={rest["aria-hidden"] ?? true}
    >
      <rect
        x="0.5"
        y="0.5"
        width="5"
        height="5"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
