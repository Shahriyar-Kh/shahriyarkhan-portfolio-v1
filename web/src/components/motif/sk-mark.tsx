import { cn } from "@/lib/cn";

export interface SkMarkProps {
  className?: string;
  /** "mono" renders as a single currentColor shape for tight contexts
   * (mobile nav, favicon-adjacent UI). "brand" (default) carries its own
   * ink-line + orange-pulse two-tone regardless of surrounding text color
   * - for light (paper) surfaces. "on-ink" is the same two-tone idea
   * calibrated for dark surfaces: a paper-colored line with the same
   * orange pulse node, since "brand"'s hardcoded ink-colored line would be
   * invisible against an ink background. */
  tone?: "brand" | "mono" | "on-ink";
  /** Continuous, restrained opacity pulse on the terminal node only
   * (reuses the existing `sk-pulse` keyframe) - for header/nav contexts
   * where the mark sits permanently on screen rather than scrolling past
   * once. Respects the global prefers-reduced-motion guard automatically
   * (animation-duration is forced to ~0 there), so no extra gating is
   * needed here. */
  pulse?: boolean;
}

const LINE_TONE_CLASS: Record<NonNullable<SkMarkProps["tone"]>, string | undefined> = {
  brand: "text-ink-primary",
  mono: undefined,
  "on-ink": "text-paper-primary",
};

const NODE_TONE_CLASS: Record<NonNullable<SkMarkProps["tone"]>, string> = {
  brand: "fill-primary",
  mono: "fill-current",
  "on-ink": "fill-primary-on-ink",
};

/**
 * The Shahriyar Khan signature mark: one engineered signal line crossing
 * an "SK" notch, resolving into a pulse node. This is the site's single
 * repeatable brand device (header, footer, hero, CTA, project numbering)
 * - deliberately not the retired blueprint/system-map diagram, and not a
 * copy of any reference logo. Pure inline SVG, no external asset.
 */
export function SkMark({ className, tone = "brand", pulse = false }: SkMarkProps) {
  return (
    <svg
      viewBox="0 0 32 22"
      className={cn("h-5 w-auto shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      <path
        d="M1 17 L9 17 L9 5 L15 5 L15 17 L23 17"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={LINE_TONE_CLASS[tone]}
      />
      <circle
        cx={27}
        cy={17}
        r={4}
        className={cn(NODE_TONE_CLASS[tone], pulse && "animate-[sk-pulse_2.4s_ease-in-out_infinite]")}
      />
    </svg>
  );
}
