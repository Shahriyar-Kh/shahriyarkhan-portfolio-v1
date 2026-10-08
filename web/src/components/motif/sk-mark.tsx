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
 * The Shahriyar Khan signature mark: bold geometric "SK" letterforms
 * framed by a restrained partial circular ring enclosure. The warm orange
 * broken ring supports the ivory monogram with architectural precision,
 * remaining instantly legible from high-res headers down to 16px favicons.
 */
export function SkMark({ className, tone = "brand", pulse = false }: SkMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-5 w-auto shrink-0", className)}
      aria-hidden
      focusable="false"
      fill="none"
    >
      {/* Partial circle / broken ring enclosure (warm orange brand accent) */}
      <path
        d="M 28 12 A 13 13 0 1 1 22 5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        data-brand-accent="true"
        className={cn(ACCENT_TONE_CLASS[tone], pulse && "animate-[sk-pulse_2.4s_ease-in-out_infinite]")}
      />
      {/* Bold geometric "S" */}
      <path
        d="M 14.2 10.5 H 10.5 C 8.6 10.5 7.2 11.6 7.2 13.2 C 7.2 14.8 8.6 15.7 10.8 16.3 L 12 16.6 C 14.2 17.2 15.4 18.2 15.4 19.8 C 15.4 21.4 14 22.5 11.8 22.5 H 8"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={MARK_TONE_CLASS[tone]}
      />
      {/* Bold geometric "K" */}
      <path
        d="M 19 9.5 V 22.5 M 19 16 L 25.5 9.5 M 19 16 L 25.5 22.5"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={MARK_TONE_CLASS[tone]}
      />
    </svg>
  );
}
