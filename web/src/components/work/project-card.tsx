import Link from "next/link";
import { CornerFrame } from "@/components/motif/corner-frame";
import { Node } from "@/components/motif/node";
import { TechList } from "@/components/work/tech-list";
import { ProjectMedia } from "@/components/work/project-media";
import { ExternalLink } from "@/components/ui/external-link";
import { isDistinctRepoUrl } from "@/lib/format";
import type { Project } from "@/lib/api/types";

export interface ProjectCardProps {
  project: Project;
  /** Only the first row in a list carries a screenshot - see
   * sections/selected-work.tsx. */
  showMedia?: boolean;
  /** Set only on the single above-the-fold card (the grid's first item) -
   * disables lazy-loading so it isn't flagged as a lazy-loaded LCP image. */
  priority?: boolean;
}

export function ProjectCard({ project, showMedia = true, priority = false }: ProjectCardProps) {
  const hasMedia = showMedia && (project.featured_image || project.preview_image);

  return (
    <CornerFrame className="flex h-full flex-col gap-4 p-6">
      {hasMedia && (
        <div className="relative aspect-video w-full overflow-hidden bg-surface">
          <ProjectMedia project={project} priority={priority} />
        </div>
      )}
      {!hasMedia && showMedia && (
        <div className="flex aspect-video w-full items-center justify-center bg-surface">
          <span className="font-heading text-headline-md text-ink-tertiary">{project.title}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Node filled={isDistinctRepoUrl(project.github_url)} />
        <Link href={`/work/${project.slug}`} className="text-headline-sm text-ink-primary hover:text-primary">
          {project.title}
        </Link>
      </div>

      <p className="line-clamp-3 text-body-sm text-ink-secondary">{project.description}</p>

      <TechList technologies={project.technologies} limit={4} />

      <div className="mt-auto flex gap-4 text-caption-sm">
        <Link href={`/work/${project.slug}`} className="text-primary hover:underline">
          Case study
        </Link>
        {project.live_url && (
          <ExternalLink href={project.live_url} className="text-ink-tertiary hover:text-ink-primary">
            Live
          </ExternalLink>
        )}
      </div>
    </CornerFrame>
  );
}
