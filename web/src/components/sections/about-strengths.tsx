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
 * FINAL-DESIGN-01B-01 Section G - "capability/strength cards", one per
 * real, published skill category (never a category the backend doesn't
 * currently return). Each card pairs a short, honest capability caption
 * (content/about.ts's ABOUT_STRENGTHS_CAPTIONS - frontend-presentation
 * copy only, matching content/services-media.ts's own established
 * pattern) with that category's real, live skills and their real
 * categorical level (LevelTrack - never a percentage or invented
 * years-of-experience figure).
 *
 * Deliberately distinct from the homepage's own full skills-capability
 * breakdown (sections/skills-capability.tsx, untouched): this shows the
 * top 3 skills per category as a curated highlight, with a link through
 * to the full breakdown, rather than every skill in every category.
 */
export function AboutStrengths({ skills }: AboutStrengthsProps) {
  const groups = skills
    ? groupSkillsByCategory(skills)
        .map((group) => ({ ...group, skills: [...group.skills].sort((a, b) => b.level - a.level).slice(0, 3) }))
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const Icon = CategoryIcon[categoryIconFor(group.categoryName)];
              return (
                <div key={group.categoryId} className="group border border-border p-6 transition-colors duration-(--motion-base) hover:border-olive/50">
                  <div className="flex items-center gap-2.5 text-olive">
                    <Icon size={20} />
                    <p className="text-headline-sm text-ink-primary">{group.categoryName}</p>
                  </div>
                  <p className="mt-3 text-body-sm text-ink-secondary">{ABOUT_STRENGTHS_CAPTIONS[group.categoryName]}</p>
                  <ul className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
                    {group.skills.map((skill) => (
                      <li key={skill.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-body-sm font-medium text-ink-primary">{skill.name}</span>
                        <LevelTrack level={skill.level} skillName={skill.name} nodeSize={6} className="text-ink-tertiary" />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link href={ABOUT_STRENGTHS_CTA.href} className="mt-8 inline-block text-body-sm font-medium text-primary hover:underline">
        {ABOUT_STRENGTHS_CTA.label} →
      </Link>
    </Section>
  );
}
