import { cn } from "@/lib/cn";

export interface SectionIndexProps {
  /** Two-digit section number, e.g. "04". */
  n: string;
  label: string;
  className?: string;
  /** "paper" renders legibly on an inverted (surface-ink) band - see
   * featured-case.tsx, the only section that inverts mid-homepage. */
  tone?: "ink" | "paper";
}

/** "04 / HOW THE SYSTEMS FIT TOGETHER" - the numbered marker used at the
 * top of every homepage section and case-study section. */
export function SectionIndex({ n, label, className, tone = "ink" }: SectionIndexProps) {
  const ruleClass = tone === "paper" ? "bg-border-on-ink" : "bg-border";
  const labelClass = tone === "paper" ? "text-paper-tertiary" : "text-ink-tertiary";
  const numberClass = tone === "paper" ? "text-primary-on-ink" : "text-primary";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className={cn("font-mono text-label", numberClass)} aria-hidden>
        {n}
      </span>
      <span aria-hidden className={cn("h-px w-8", ruleClass)} />
      <span className={cn("text-label uppercase", labelClass)}>{label}</span>
    </div>
  );
}
