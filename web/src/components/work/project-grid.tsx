import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/work/project-card";
import type { Project } from "@/lib/api/types";

export interface ProjectGridProps {
  projects: readonly Project[] | null;
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects === null) {
    return (
      <EmptyState
        title="Project data is temporarily unavailable."
        description="Please try again shortly, or get in touch directly."
      />
    );
  }

  if (projects.length === 0) {
    return <EmptyState title="No published projects yet." />;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} priority={index === 0} />
      ))}
    </div>
  );
}
