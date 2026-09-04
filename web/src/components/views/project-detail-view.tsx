import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { ProjectCaseSections } from "@/components/work/project-case-sections";
import { ProjectHero } from "@/components/work/project-hero";
import { resolveCaseContent } from "@/lib/case-study-merge";
import type { ProjectWithOptionalCaseStudy } from "@/lib/api/types";
import type { CaseStudy } from "@/content/case-studies/types";

export interface ProjectDetailViewProps {
  project: ProjectWithOptionalCaseStudy;
  caseStudy: CaseStudy | null;
}

export function ProjectDetailView({ project, caseStudy }: ProjectDetailViewProps) {
  const content = resolveCaseContent(project, caseStudy);

  return (
    <Section>
      <ProjectHero project={project} />
      <div className="mt-12 max-w-3xl">
        {content.isEmpty ? (
          <EmptyState title="Further case-study detail for this project is not yet published." />
        ) : (
          <ProjectCaseSections content={content} />
        )}
      </div>
    </Section>
  );
}

export interface ProjectUnavailableViewProps {
  message: string;
}

export function ProjectUnavailableView({ message }: ProjectUnavailableViewProps) {
  return (
    <Section>
      <EmptyState title="This project's details are temporarily unavailable." description={message} />
    </Section>
  );
}
