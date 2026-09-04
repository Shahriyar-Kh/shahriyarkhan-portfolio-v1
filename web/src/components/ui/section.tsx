import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const SHELL_CLASS = {
  readable: "shell-readable",
  standard: "section-shell",
  wide: "shell-wide",
} as const;

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Which shared shell width the content column uses - see globals.css's
   * "Shared shell system" doc comment for the full rationale. Defaults to
   * "standard" (80rem, unchanged from before this prop existed), so every
   * existing caller keeps its exact current width. Pass "wide" only for a
   * deliberate, documented reason (a section whose job is visual, not
   * dense text) - not as a default choice. */
  shell?: keyof typeof SHELL_CLASS;
}

/**
 * FINAL-DESIGN-01A-R5 Part A: `className` (background, border, padding -
 * every real caller today passes one of those, never a width/layout
 * class) now lands on this OUTER, always full-bleed `<section>`, not on
 * the width-constrained box. The shell width lives entirely on the INNER
 * div, which paints nothing itself. Before this split, a caller like
 * `<Section className="bg-surface-olive">` had its background trapped
 * inside the same 1280px cap as the content - invisible on a paper-on-
 * paper section, a real full-bleed-background bug everywhere else.
 */
export function Section({ className, shell = "standard", children, ...rest }: SectionProps) {
  return (
    <section className={cn("w-full", className)} {...rest}>
      <div className={cn(SHELL_CLASS[shell], "py-16 sm:py-20")}>{children}</div>
    </section>
  );
}
