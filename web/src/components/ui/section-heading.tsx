import type { ElementType, ReactNode } from "react";
import { SectionIndex } from "@/components/motif/section-index";
import { cn } from "@/lib/cn";

export interface SectionHeadingProps {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  as?: ElementType;
  className?: string;
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  subtitle,
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {index && eyebrow ? (
        <SectionIndex n={index} label={eyebrow} className="mb-4" />
      ) : eyebrow ? (
        <p className="mb-3 text-label text-accent uppercase">{eyebrow}</p>
      ) : null}
      <Heading className="text-headline-lg text-ink-primary sm:text-display-sm">{title}</Heading>
      {subtitle && <p className="mt-3 text-body text-ink-secondary">{subtitle}</p>}
    </div>
  );
}
