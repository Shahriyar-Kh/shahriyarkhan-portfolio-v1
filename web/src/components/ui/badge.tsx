import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "accent" | "success";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-border text-ink-secondary",
  primary: "border-primary/40 text-primary",
  accent: "border-accent/40 text-accent",
  success: "border-accent/40 text-accent",
};

export interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-caption-sm",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
