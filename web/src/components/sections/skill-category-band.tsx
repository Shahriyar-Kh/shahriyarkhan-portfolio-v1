import { CategoryIcon, categoryIconFor } from "@/components/icons/tech-icons";
import { LevelTrack } from "@/components/skills/level-track";
import type { SkillCategoryGroup } from "@/lib/skills";

export interface SkillCategoryBandProps {
  group: SkillCategoryGroup;
}

/**
 * FINAL-DESIGN-01E-01 - one row of the Capability Index: a full-width
 * editorial band (category name + icon, then every real skill in that
 * category as an inline name/level pair), not a bordered card. Every
 * skill in the category always renders - this is the exhaustive index,
 * distinct from the curated Core Stack row above it and from the
 * homepage's own 2-3 column card grid (sections/skills-capability.tsx,
 * untouched).
 */
export function SkillCategoryBand({ group }: SkillCategoryBandProps) {
  const Icon = CategoryIcon[categoryIconFor(group.categoryName)];

  return (
    <div className="grid gap-3 border-t border-border py-6 sm:grid-cols-[10rem_1fr] sm:gap-8 sm:py-8">
      <div className="flex items-center gap-2 text-ink-primary sm:pt-0.5">
        <Icon size={18} className="text-olive" />
        <p className="text-headline-sm">{group.categoryName}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border sm:divide-y-0 sm:gap-3">
        {group.skills.map((skill) => (
          <li key={skill.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 sm:py-0">
            <span className="text-body-sm text-ink-primary">{skill.name}</span>
            <LevelTrack level={skill.level} skillName={skill.name} nodeSize={6} className="text-ink-tertiary" />
          </li>
        ))}
      </ul>
    </div>
  );
}
