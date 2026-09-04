import { Node } from "@/components/motif/node";
import type { ClaimStatus } from "@/content/case-studies/types";
import { cn } from "@/lib/cn";

export interface ClaimBadgeProps {
  status: ClaimStatus;
  className?: string;
}

/** Filled = verified, hollow = inferred - an epistemic marker, not a
 * marketing badge. Only ever rendered for verified/inferred claims -
 * pending/prohibited claims never reach the page at all. */
export function ClaimBadge({ status, className }: ClaimBadgeProps) {
  const label = status === "verified" ? "Verified" : "Conservatively stated";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Node filled={status === "verified"} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
