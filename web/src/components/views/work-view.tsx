import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProjectArchive } from "@/components/work/project-archive";
import { WORK_INTRO } from "@/content/work";
import type { Project } from "@/lib/api/types";

export interface WorkViewProps {
  projects: readonly Project[] | null;
}

/**
 * FINAL-DESIGN-01C-01 - the premium /work project archive. Plain,
 * synchronous, prop-driven (this is what makes "Work render" tests
 * possible without a Server Component test harness) - all real content
 * and motion lives in ProjectArchive/ProjectFrame.
 */
export function WorkView({ projects }: WorkViewProps) {
  return (
    <Section className="pt-16 sm:pt-20">
      <SectionHeading as="h1" eyebrow={WORK_INTRO.eyebrow} title={WORK_INTRO.title} subtitle={WORK_INTRO.lead} />
      {projects && projects.length > 0 && (
        <p className="mt-2 font-mono text-caption-sm text-ink-hint">
          {projects.length} published project{projects.length === 1 ? "" : "s"}
        </p>
      )}
      <div className="mt-12">
        <ProjectArchive projects={projects} />
      </div>
    </Section>
  );
}
