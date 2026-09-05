import Link from "next/link";
import { CategoryIcon, categoryIconFor } from "@/components/icons/tech-icons";
import { SectionIndex } from "@/components/motif/section-index";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { LevelTrack } from "@/components/skills/level-track";
import { ABOUT_STRENGTHS_CAPTIONS, ABOUT_STRENGTHS_COPY, ABOUT_STRENGTHS_CTA } from "@/content/about";
import type { Skill } from "@/lib/api/types";
import { groupSkillsByCategory } from "@/lib/skills";

export interface AboutStrengthsProps {
  skills: readonly Skill[] | null;
}

/**
 * FINAL-DESIGN-01B-01 Section G - a capability *summary*, one row per
 * real, published skill category (never a category the backend doesn't
 * currently return).
 *
 * FINAL-DESIGN-01B-01-R2: rebuilt from a grid of five bordered cards
 * (which, at three skills each, read as a smaller mirror of the full
 * Skills page rather than a distinct summary) into a divided list that
 * leads with the practical-purpose caption (content/about.ts's
 * ABOUT_STRENGTHS_CAPTIONS - the same "what this is actually for"
 * framing as before) and trims each row to its top 2 skills, not 3.
 * Categorical LevelTrack marks are unchanged (no percentage, no
 * invented years-of-experience figure); the full breakdown - every
 * skill, every category, the Core Stack row - stays on /skills via the
 * link below, which this page deliberately does not reproduce.
 */
export function AboutStrengths({ skills }: AboutStrengthsProps) {
  const groups = skills
    ? groupSkillsByCategory(skills)
        .map((group) => ({ ...group, skills: [...group.skills].sort((a, b) => b.level - a.level).slice(0, 2) }))
        .filter((group) => ABOUT_STRENGTHS_CAPTIONS[group.categoryName])
    : [];

  return (
    <Section className="border-t border-border">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionIndex n="05" label={ABOUT_STRENGTHS_COPY.eyebrow} className="mb-6" />
          <h2 className="max-w-xl text-display-sm text-ink-primary sm:text-display-md">{ABOUT_STRENGTHS_COPY.title}</h2>
          <p className="mt-4 max-w-xl text-body text-ink-secondary">{ABOUT_STRENGTHS_COPY.lead}</p>
        </div>
      </div>

      <div className="mt-10">
        {!skills ? (
          <EmptyState title="Skill data is temporarily unavailable." />
        ) : groups.length === 0 ? (
          <EmptyState title="No published skills yet." />
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {groups.map((group) => {
              const Icon = CategoryIcon[categoryIconFor(group.categoryName)];
              return (
                <li key={group.categoryId} className="grid gap-3 py-6 sm:grid-cols-[10rem_1fr_auto] sm:items-center sm:gap-6">
                  <div className="flex items-center gap-2.5 text-olive">
                    <Icon size={18} />
                    <p className="text-body-sm font-medium text-ink-primary">{group.categoryName}</p>
                  </div>
                  <p className="text-body-sm text-ink-secondary">{ABOUT_STRENGTHS_CAPTIONS[group.categoryName]}</p>
                  <ul className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
                    {group.skills.map((skill) => (
                      <li key={skill.id} className="flex items-center gap-2">
                        <span className="text-caption-sm text-ink-tertiary">{skill.name}</span>
                        <LevelTrack level={skill.level} skillName={skill.name} nodeSize={5} className="text-ink-tertiary" />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Link href={ABOUT_STRENGTHS_CTA.href} className="mt-8 inline-block text-body-sm font-medium text-primary hover:underline">
        {ABOUT_STRENGTHS_CTA.label} →
      </Link>
    </Section>
  );
}
