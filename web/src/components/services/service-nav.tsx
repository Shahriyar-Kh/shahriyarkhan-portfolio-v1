import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Service } from "@/lib/api/types";

export interface ServiceNavProps {
  services: readonly Service[];
  currentSlug: string;
}

/**
 * FINAL-DESIGN-01D-02 - previous/next browsing between service detail
 * pages, mirroring work/project-nav.tsx's exact contract (same real
 * ordering getServices() renders in - backend-sorted by display_order,
 * never re-sorted here; wraps around at the ends). A service-specific
 * sibling rather than a generalized shared component, since
 * ProjectNav's own doc comment ties its ordering guarantee explicitly
 * to getProjects() - keeping the two separate avoids silently coupling
 * that guarantee across two different API resources.
 */
export function ServiceNav({ services, currentSlug }: ServiceNavProps) {
  if (services.length < 2) return null;
  const index = services.findIndex((s) => s.slug === currentSlug);
  if (index === -1) return null;

  const prev = services[(index - 1 + services.length) % services.length]!;
  const next = services[(index + 1) % services.length]!;

  return (
    <nav aria-label="More services" className="mt-16 grid grid-cols-1 gap-6 border-t border-border pt-8 sm:grid-cols-2">
      <Link href={`/services/${prev.slug}`} className="group flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 font-mono text-caption-sm text-ink-hint">
          <Icon.ChevronLeft size={12} aria-hidden /> Previous
        </span>
        <span className="text-body-sm font-medium text-ink-primary group-hover:text-primary">{prev.title}</span>
      </Link>
      <Link href={`/services/${next.slug}`} className="group flex flex-col gap-1 sm:items-end sm:text-right">
        <span className="inline-flex items-center gap-1.5 font-mono text-caption-sm text-ink-hint">
          Next <Icon.ChevronRight size={12} aria-hidden />
        </span>
        <span className="text-body-sm font-medium text-ink-primary group-hover:text-primary">{next.title}</span>
      </Link>
    </nav>
  );
}
