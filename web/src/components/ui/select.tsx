import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Deliberately native <select> - full keyboard/screen-reader behavior
 * for free, zero JS. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full border bg-input px-3 py-2 text-body-sm text-ink-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        invalid ? "border-destructive" : "border-border",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
