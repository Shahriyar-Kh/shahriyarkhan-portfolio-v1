import { Badge } from "@/components/ui/badge";
import type { Technology } from "@/lib/api/types";

export interface TechListProps {
  technologies: readonly Technology[];
  limit?: number;
}

export function TechList({ technologies, limit }: TechListProps) {
  if (technologies.length === 0) return null;
  const shown = limit ? technologies.slice(0, limit) : technologies;
  const remaining = limit ? technologies.length - shown.length : 0;

  return (
    <ul className="flex flex-wrap gap-2">
      {shown.map((tech) => (
        <li key={tech.id}>
          <Badge>{tech.name}</Badge>
        </li>
      ))}
      {remaining > 0 && (
        <li>
          <Badge tone="neutral">+{remaining}</Badge>
        </li>
      )}
    </ul>
  );
}
