import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full border bg-input px-3 py-2 text-body-sm text-ink-primary placeholder:text-ink-hint",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        invalid ? "border-destructive" : "border-border",
        className,
      )}
      {...rest}
    />
  );
});
