import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { BreadcrumbNav } from "@/components/work/breadcrumb-nav";
import { ProjectCaseSections } from "@/components/work/project-case-sections";
import { ProjectHero } from "@/components/work/project-hero";
import { ProjectNav } from "@/components/work/project-nav";
import { resolveCaseContent } from "@/lib/case-study-merge";
import type { Project, ProjectWithOptionalCaseStudy } from "@/lib/api/types";
import type { CaseStudy } from "@/content/case-studies/types";

export interface ProjectDetailViewProps {
  project: ProjectWithOptionalCaseStudy;
  caseStudy: CaseStudy | null;
  /** Null when the sibling list fetch failed - prev/next simply doesn't
   * render rather than showing a broken or misleading control. */
  allProjects: readonly Project[] | null;
}

/**
 * FINAL-DESIGN-01C-02: adds a visual breadcrumb (the on-page counterpart
 * to lib/json-ld.ts's long-existing breadcrumbSchema()) and prev/next
 * browsing across the same real project order /work renders. Both are
 * additive to the existing hero + case-sections composition; the three
 * behaviors project-detail-view.test.tsx already locks in (the h1, the
 * editorial claim text, the "not yet published" honesty) are unchanged.
 */
export function ProjectDetailView({ project, caseStudy, allProjects }: ProjectDetailViewProps) {
  const content = resolveCaseContent(project, caseStudy);

  return (
    <Section>
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Work", href: "/work" }, { label: project.title }]} />
      <ProjectHero project={project} caseStudy={caseStudy} />
      <div className="mt-12 max-w-3xl">
        {content.isEmpty ? (
          <EmptyState title="Further case-study detail for this project is not yet published." />
        ) : (
          <ProjectCaseSections content={content} />
        )}
      </div>
      {allProjects && <ProjectNav projects={allProjects} currentSlug={project.slug} />}
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
