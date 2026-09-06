import { Badge } from "@/components/ui/badge";
import { Node } from "@/components/motif/node";
import { TechList } from "@/components/work/tech-list";
import { ProjectGallery } from "@/components/work/project-gallery";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import type { CaseStudy } from "@/content/case-studies/types";
import { isDistinctRepoUrl } from "@/lib/format";
import type { Project } from "@/lib/api/types";

export interface ProjectHeroProps {
  project: Project;
  caseStudy: CaseStudy | null;
}

/**
 * FINAL-DESIGN-01C-02: adds real, derived status/type badges above the
 * title (Live/Case-study from live_url, Client project only from
 * caseStudy.projectContext - see types.ts's doc comment, Open source
 * only for a genuinely distinct repo) and swaps the plain CornerFrame+
 * ProjectMedia box for ProjectGallery (same 3-tier real-media fallback,
 * now with a keyboard-accessible full-size view).
 */
export function ProjectHero({ project, caseStudy }: ProjectHeroProps) {
  const distinctRepo = isDistinctRepoUrl(project.github_url);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {project.live_url ? <Badge tone="accent">Live</Badge> : <Badge tone="neutral">Case study</Badge>}
          {caseStudy?.projectContext === "client" && <Badge tone="neutral">Client project</Badge>}
          {distinctRepo && <Badge tone="neutral">Open source</Badge>}
        </div>

        <h1 className="mt-4 text-display-sm text-ink-primary">{project.title}</h1>
        {(project.ai_summary || project.description) && (
          <p className="mt-4 text-body text-ink-secondary">{project.ai_summary || project.description}</p>
        )}

        <div className="mt-6">
          <TechList technologies={project.technologies} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {project.live_url && (
            <Button href={project.live_url} target="_blank" rel="noopener noreferrer" data-analytics-event="project_cta_click">
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

      <ProjectGallery project={project} liveUrl={project.live_url} />
    </div>
  );
}
