import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SystemMap, type SystemMapLayer } from "@/components/motif/system-map";
import type { Skill } from "@/lib/api/types";

export interface SystemMapSectionProps {
  skills: readonly Skill[] | null;
}

const FALLBACK_LAYERS: readonly [string[], string[], string[], string[]] = [
  ["React", "Next.js"],
  ["Django REST Framework"],
  ["JWT"],
  ["PostgreSQL"],
];

function pickForLayer(skills: readonly Skill[], keywords: readonly string[]): string[] {
  const matched = skills
    .filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k)))
    .map((s) => s.name);
  return matched.length > 0 ? matched.slice(0, 3) : [];
}

/**
 * Section 04 - the signature scroll-driven experience, full-bleed, zero
 * cards. Placement is deliberately here (below the fold, 4th of 11) per
 * the motion map's placement rule. Technology labels prefer live Skill
 * data so the diagram can't drift from what the API actually reports;
 * falls back to a fixed, conservative set only when the fetch failed.
 */
export function SystemMapSection({ skills }: SystemMapSectionProps) {
  const layers: [SystemMapLayer, SystemMapLayer, SystemMapLayer, SystemMapLayer] = skills
    ? [
        { label: "Client", technologies: pickForLayer(skills, ["react", "next", "javascript", "typescript"]) },
        { label: "REST API", technologies: pickForLayer(skills, ["django", "drf", "python", "rest"]) },
        { label: "Auth", technologies: pickForLayer(skills, ["jwt", "auth", "oauth"]) },
        { label: "Data", technologies: pickForLayer(skills, ["postgres", "sql", "database"]) },
      ]
    : [
        { label: "Client", technologies: FALLBACK_LAYERS[0] },
        { label: "REST API", technologies: FALLBACK_LAYERS[1] },
        { label: "Auth", technologies: FALLBACK_LAYERS[2] },
        { label: "Data", technologies: FALLBACK_LAYERS[3] },
      ];

  return (
    <Section className="border-t border-border">
      <SectionHeading
        index="04"
        eyebrow="Architecture"
        title="How the systems fit together"
        subtitle="The shape most of these projects share: a client, a REST API, an authentication layer, and a data store."
      />
      <div className="mt-10">
        <SystemMap layers={layers} />
      </div>
    </Section>
  );
}
