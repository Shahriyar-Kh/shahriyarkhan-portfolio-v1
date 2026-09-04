import { Counter } from "@/components/ui/counter";
import type { Education, Experience, Project, Service } from "@/lib/api/types";

export interface ProofStripProps {
  projects: readonly Project[] | null;
  experiences: readonly Experience[] | null;
  education: readonly Education[] | null;
  services: readonly Service[] | null;
}

interface ProofItem {
  key: string;
  value: number;
  label: string;
}

/**
 * Section C - real counts only, each one a `.length` on live API data,
 * animated once in view (components/ui/counter.tsx). Never a years-of-
 * experience, client-count, or success-rate figure - none of those exist
 * anywhere in the backend. A metric with a zero or missing count is
 * simply omitted, never shown as "0" or backfilled with a guess.
 */
export function ProofStrip({ projects, experiences, education, services }: ProofStripProps) {
  const items: ProofItem[] = [];
  if (projects && projects.length > 0) items.push({ key: "projects", value: projects.length, label: "Published projects" });
  if (services && services.length > 0) items.push({ key: "services", value: services.length, label: "Service categories" });
  if (experiences && experiences.length > 0) items.push({ key: "roles", value: experiences.length, label: "Professional roles" });
  if (education && education.length > 0) items.push({ key: "education", value: education.length, label: education.length > 1 ? "Degrees" : "Degree" });

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border bg-paper-raised">
      <div className="section-shell grid grid-cols-2 gap-8 py-10 sm:grid-cols-4 sm:py-12">
        {items.map((item) => (
          <div key={item.key} className="border-l-2 border-primary/50 pl-4">
            <p className="font-heading text-display-sm text-ink-primary">
              <Counter value={item.value} />
              <span className="text-primary">+</span>
            </p>
            <p className="mt-1 font-mono text-caption-sm text-ink-tertiary uppercase">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
