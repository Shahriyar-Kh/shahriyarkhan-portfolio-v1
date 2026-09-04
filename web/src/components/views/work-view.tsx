import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProjectGrid } from "@/components/work/project-grid";
import type { Project } from "@/lib/api/types";

export interface WorkViewProps {
  projects: readonly Project[] | null;
}

/** Plain, synchronous, prop-driven - this is what makes "Work render"
 * tests possible without a Server Component test harness. */
export function WorkView({ projects }: WorkViewProps) {
  return (
    <Section>
      <SectionHeading
        index="01"
        eyebrow="Work"
        title="Selected work"
        subtitle="Systems built with a verified live URL or repository - not a portfolio of screenshots."
      />
      <div className="mt-10">
        <ProjectGrid projects={projects} />
      </div>
    </Section>
  );
}
