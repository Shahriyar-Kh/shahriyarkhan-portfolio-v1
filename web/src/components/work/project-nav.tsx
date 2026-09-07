import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Project } from "@/lib/api/types";

export interface ProjectNavProps {
  projects: readonly Project[];
  currentSlug: string;
}

/**
 * FINAL-DESIGN-01C-02: previous/next browsing between case studies,
 * using the same real ordering /work's archive renders in (whatever
 * `getProjects()` returns - backend-sorted by display_order, never
 * re-sorted here). Wraps around at the ends (last -> first, first ->
 * last) so there is always a next project to browse to, rather than a
 * dead-end "Next" that quietly does nothing on the last project.
 */
export function ProjectNav({ projects, currentSlug }: ProjectNavProps) {
  if (projects.length < 2) return null;
  const index = projects.findIndex((p) => p.slug === currentSlug);
  if (index === -1) return null;

  const prev = projects[(index - 1 + projects.length) % projects.length]!;
  const next = projects[(index + 1) % projects.length]!;

  return (
    <nav aria-label="More projects" className="mt-16 grid grid-cols-1 gap-6 border-t border-border pt-8 sm:grid-cols-2">
      <Link href={`/work/${prev.slug}`} className="group flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 font-mono text-caption-sm text-ink-hint">
          <Icon.ChevronLeft size={12} aria-hidden /> Previous
        </span>
        <span className="text-body-sm font-medium text-ink-primary group-hover:text-primary">{prev.title}</span>
      </Link>
      <Link href={`/work/${next.slug}`} className="group flex flex-col gap-1 sm:items-end sm:text-right">
        <span className="inline-flex items-center gap-1.5 font-mono text-caption-sm text-ink-hint">
          Next <Icon.ChevronRight size={12} aria-hidden />
        </span>
        <span className="text-body-sm font-medium text-ink-primary group-hover:text-primary">{next.title}</span>
      </Link>
    </nav>
  );
}
