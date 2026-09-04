import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <textarea
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
