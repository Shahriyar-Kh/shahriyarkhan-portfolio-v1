import { CornerFrame } from "@/components/motif/corner-frame";
import { Node } from "@/components/motif/node";
import { TechList } from "@/components/work/tech-list";
import { ProjectMedia } from "@/components/work/project-media";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { isDistinctRepoUrl } from "@/lib/format";
import type { Project } from "@/lib/api/types";

export interface ProjectHeroProps {
  project: Project;
}

export function ProjectHero({ project }: ProjectHeroProps) {
  const hasMedia = project.featured_image || project.preview_image;
  const distinctRepo = isDistinctRepoUrl(project.github_url);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div>
        <h1 className="text-display-sm text-ink-primary">{project.title}</h1>
        {project.ai_summary && <p className="mt-4 text-body text-ink-secondary">{project.ai_summary}</p>}
        <div className="mt-6">
          <TechList technologies={project.technologies} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {project.live_url && (
            <Button href={project.live_url} data-analytics-event="project_cta_click">
              View live
            </Button>
          )}
          <div className="flex items-center gap-2 text-caption-sm text-ink-tertiary">
            <Node filled={distinctRepo} />
            {project.github_url ? (
              <ExternalLink href={project.github_url} className="hover:text-ink-primary">
                {distinctRepo ? "Source code" : "GitHub profile"}
              </ExternalLink>
            ) : (
              <span>No public repository</span>
            )}
          </div>
        </div>
      </div>

      {hasMedia && (
        <CornerFrame>
          <div className="relative aspect-video w-full overflow-hidden bg-surface">
            <ProjectMedia project={project} variant="hero" />
          </div>
        </CornerFrame>
      )}
    </div>
  );
}
