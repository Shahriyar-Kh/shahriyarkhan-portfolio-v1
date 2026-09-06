"use client";

import Link from "next/link";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { ProjectFrame } from "@/components/work/project-frame";
import { TechList } from "@/components/work/tech-list";
import type { Project } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { isDistinctRepoUrl } from "@/lib/format";
import { selectFeaturedCase } from "@/lib/home-selection";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

export interface ProjectArchiveProps {
  projects: readonly Project[] | null;
}

/**
 * FINAL-DESIGN-01C-01 - the /work archive grid. Deliberately not a
 * second copy of the homepage's ProjectProofTimeline (sections/project-
 * proof-timeline.tsx, untouched): that's a curated, alternating-side
 * scroll narrative built around a handful of case-study "chapters" - this
 * is the complete, real archive of every published project, in one
 * editorial grid, with the deterministic featured project (the same
 * `selectFeaturedCase` the homepage uses - evidence-driven, not
 * hardcoded) given a wide spotlight card. Media reuses ProjectFrame as-is
 * (its 3-tier real-screenshot / real-API-image / honest-SkMark-tile
 * fallback is already privacy-reviewed and homepage-approved) for
 * screenshot prominence without a second, duplicate fallback system.
 *
 * Every card's real text (status, title, description, tech list, links)
 * renders at full opacity unconditionally - only a small on-scroll `y`
 * settle is ever animated, matching this codebase's motion-hierarchy
 * rule (see about-hero.tsx's doc comment for the fuller reasoning: a
 * transform-only settle can never produce a "blank" state the way
 * opacity/clip-path hiding can).
 */
export function ProjectArchive({ projects }: ProjectArchiveProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useScrollReveal(
    rootRef,
    (api) => {
      const cards = rootRef.current?.querySelectorAll<HTMLElement>("[data-archive-card]");
      if (!cards || cards.length === 0) return;
      api.gsap.from(Array.from(cards), {
        y: 24,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true },
      });
    },
    [projects?.length],
  );

  if (!projects) {
    return <EmptyState title="Project data is temporarily unavailable." description="Please try again shortly, or get in touch directly." />;
  }
  if (projects.length === 0) {
    return <EmptyState title="No published projects yet." />;
  }

  const featured = selectFeaturedCase(projects);

  return (
    <div ref={rootRef} className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
      {projects.map((project) => (
        <ArchiveCard key={project.id} project={project} spotlight={project.id === featured?.id} />
      ))}
    </div>
  );
}

interface ArchiveCardProps {
  project: Project;
  spotlight: boolean;
}

/**
 * The media block is deliberately NOT wrapped in its own `<Link>`: when
 * ProjectFrame renders its tall-screenshot variant it already contains
 * a real `<a>` ("Open live project" in the browser-chrome bar) -
 * wrapping that in a second, outer `<a>` would nest anchors, which is
 * invalid HTML and breaks the inner link's own click/keyboard behavior.
 * The title and the explicit "Case study" link below are the card's
 * real navigational affordances for every media variant alike.
 */
function ArchiveCard({ project, spotlight }: ArchiveCardProps) {
  const hasDistinctRepo = isDistinctRepoUrl(project.github_url);

  return (
    <article data-archive-card className={cn("flex flex-col", spotlight && "lg:col-span-2")}>
      <div className={cn("overflow-hidden rounded-sm border border-border", spotlight ? "aspect-21/9" : "aspect-video")}>
        <ProjectFrame project={project} className="h-full w-full" sizes={spotlight ? "(min-width: 1024px) 100vw, 100vw" : "(min-width: 1024px) 50vw, 100vw"} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {project.live_url ? <Badge tone="accent">Live</Badge> : <Badge tone="neutral">Case study</Badge>}
        {hasDistinctRepo && <Badge tone="neutral">Open source</Badge>}
      </div>

      <h2 className="mt-3 text-headline-lg text-ink-primary">
        <Link href={`/work/${project.slug}`} className="hover:text-primary">
          {project.title}
        </Link>
      </h2>

      {project.description && <p className="mt-2 line-clamp-3 max-w-2xl text-body-sm text-ink-secondary">{project.description}</p>}

      {project.technologies.length > 0 && (
        <div className="mt-4">
          <TechList technologies={project.technologies} limit={spotlight ? 8 : 5} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-5">
        <Link href={`/work/${project.slug}`} className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline">
          Case study <Icon.ArrowRight size={14} aria-hidden />
        </Link>
        {project.live_url && (
          <ExternalLink
            href={project.live_url}
            className="inline-flex items-center gap-1 text-body-sm font-medium text-ink-secondary hover:text-ink-primary"
            data-analytics-event="project_cta_click"
          >
            Live <Icon.ArrowUpRight size={14} aria-hidden />
          </ExternalLink>
        )}
      </div>
    </article>
  );
}
