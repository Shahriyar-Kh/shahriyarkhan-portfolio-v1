import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** "paper" renders legibly on an inverted/dark section background (e.g.
   * services-capability.tsx's olive/ink surface) - same convention as
   * motif/section-index.tsx's own tone prop. */
  tone?: "ink" | "paper";
}

/**
 * The single place in this codebase a data-failure or empty-result
 * message is authored. Every list-backed section/page renders this
 * instead of fake or stale data when a fetch fails or returns nothing -
 * see src/lib/api/errors.ts's ApiResult design.
 */
export function EmptyState({ title, description, action, className, tone = "ink" }: EmptyStateProps) {
  const borderClass = tone === "paper" ? "border-border-on-ink" : "border-border";
  const titleClass = tone === "paper" ? "text-paper-secondary" : "text-ink-secondary";
  const descriptionClass = tone === "paper" ? "text-paper-tertiary" : "text-ink-hint";

  return (
    <div className={cn("border border-dashed px-6 py-10 text-center", borderClass, className)}>
      <p className={cn("text-body-sm", titleClass)}>{title}</p>
      {description && <p className={cn("mt-1 text-caption-sm", descriptionClass)}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
