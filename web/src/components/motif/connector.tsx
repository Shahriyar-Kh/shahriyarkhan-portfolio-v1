import { cn } from "@/lib/cn";

export interface ConnectorProps {
  /** "horizontal" draws a straight left-to-right rule. "vertical" draws
   * top-to-bottom. Both are pure straight lines - the motif's Run never
   * curves; only System Map (an SVG of its own) draws orthogonal bends. */
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/** The 1px rule primitive - "a Run". No curves, hard 90deg corners only
 * (corners are composed by placing two Runs, not by curving one). */
export function Connector({ orientation = "horizontal", className }: ConnectorProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "block shrink-0 bg-primary",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
