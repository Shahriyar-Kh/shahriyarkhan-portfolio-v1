import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

function base(className?: string, extra?: string) {
  return cn(extra, className);
}

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={base(
        className,
        "surface-elevated rounded-md p-6 shadow-elevation-sm transition-shadow duration-(--motion-fast) hover:shadow-glow-sm",
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={base(className, "mb-3")} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h3 className={base(className, "text-headline-sm text-ink-primary")} {...rest}>
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={base(className, "text-body-sm text-ink-secondary")} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={base(className, "mt-4")} {...rest}>
      {children}
    </div>
  );
}
