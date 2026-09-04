import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Owns the label/hint/error-message wiring so every form control gets
 * identical, correct aria-describedby/aria-invalid plumbing - the
 * caller only needs to pass the same `htmlFor`/`id` to its input.
 */
export function Field({ label, htmlFor, required, hint, error, children, className }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-label text-ink-tertiary uppercase">
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-accent">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-caption-sm text-ink-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Convenience for wiring aria-describedby onto the actual input. */
export function fieldDescribedBy(htmlFor: string, hint?: string, error?: string): string | undefined {
  const ids = [error ? `${htmlFor}-error` : null, hint && !error ? `${htmlFor}-hint` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
