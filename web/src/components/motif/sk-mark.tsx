import { cn } from "@/lib/cn";

export interface SkMarkProps {
  className?: string;
  /** "mono" renders as one currentColor mark for compact contexts.
   * "brand" and "on-ink" use the two-tone signature palette. */
  tone?: "brand" | "mono" | "on-ink";
  /** Adds a restrained pulse to the monogram's central system node. */
  pulse?: boolean;
}

const MARK_TONE_CLASS: Record<NonNullable<SkMarkProps["tone"]>, string | undefined> = {
  brand: "text-ink-primary",
  mono: undefined,
  "on-ink": "text-paper-primary",
};

const ACCENT_TONE_CLASS: Record<NonNullable<SkMarkProps["tone"]>, string> = {
  brand: "stroke-primary",
  mono: "stroke-current",
  "on-ink": "stroke-primary-on-ink",
};

/**
 * The Shahriyar Khan signature mark: a geometric S contour shares a central
 * spine with a sharp K. The small center node is an architectural join,
 * giving the monogram a systems-minded detail without turning it into a
 * graph, chart, or decorative signal line.
 */
export function SkMark({ className, tone = "brand", pulse = false }: SkMarkProps) {
  return (
    <svg
      viewBox="0 0 44 28"
      className={cn("h-5 w-auto shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      <path
        d="M18 4 H8 C4.7 4 3 5.7 3 8.2 C3 10.5 4.7 11.7 7.5 12.5 L13.5 14.3 C16.5 15.2 18 16.6 18 19.2 C18 22 16.1 24 12.8 24 H3"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={MARK_TONE_CLASS[tone]}
      />
      <path
        d="M25 4 V24 M25 14 L41 4 M25 14 L41 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={MARK_TONE_CLASS[tone]}
      />
      <rect
        x={22.8}
        y={11.8}
        width={4.4}
        height={4.4}
        rx={0.7}
        data-brand-accent="true"
        fill="currentColor"
        className={cn(ACCENT_TONE_CLASS[tone], pulse && "animate-[sk-pulse_2.4s_ease-in-out_infinite]")}
      />
    </svg>
  );
}
