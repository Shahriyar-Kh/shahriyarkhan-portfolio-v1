import { cn } from "@/lib/cn";

export interface BlueprintGridProps {
  className?: string;
}

/**
 * The reusable, component-form version of the hairline grid also applied
 * globally to <body> in globals.css - used to give an individual section
 * or panel its own contained grid texture without stacking another full
 * repeating-gradient onto the body background. Absolutely positioned,
 * decorative only.
 */
export function BlueprintGrid({ className }: BlueprintGridProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, var(--color-border) 0px, var(--color-border) 1px, transparent 1px, transparent 64px)," +
          "repeating-linear-gradient(90deg, var(--color-border) 0px, var(--color-border) 1px, transparent 1px, transparent 64px)",
        opacity: 0.4,
      }}
    />
  );
}
