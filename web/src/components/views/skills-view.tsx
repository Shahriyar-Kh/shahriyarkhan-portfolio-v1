import Link from "next/link";
import { LevelTrack } from "@/components/skills/level-track";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Skill } from "@/lib/api/types";
import { groupSkillsByCategory } from "@/lib/skills";

export interface SkillsViewProps {
  skills: readonly Skill[] | null;
}

/**
 * The standalone skills route (owner-required content restoration - see
 * docs/rebuild/FINAL_V2_CONTENT_PARITY_MATRIX.md). Every level renders as
 * its real categorical label via LevelTrack, never as a fabricated
 * percentage - the same discipline /experience and /resume already use.
 */
export function SkillsView({ skills }: SkillsViewProps) {
  const groups = skills ? groupSkillsByCategory(skills) : [];

  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <SectionHeading
          eyebrow="Skills"
          title="Technologies and proficiency"
          subtitle="Every skill category on the site, grouped as it's maintained in the backend. Levels are categorical (Beginner, Intermediate, Advanced, Expert), never a self-rated percentage."
        />
      </Section>

      <Section className="border-t border-border">
        {!skills ? (
          <EmptyState title="Skill data is temporarily unavailable." description="Please try again shortly." />
        ) : skills.length === 0 ? (
          <EmptyState title="No published skills yet." />
        ) : (
          <div className="grid gap-10 sm:grid-cols-2">
            {groups.map((group) => (
              <div key={group.categoryId} className="border-t border-border pt-4">
                <p className="text-label text-accent uppercase">{group.categoryName}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {group.skills.map((skill) => (
                    <li key={skill.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-body-sm text-ink-primary">{skill.name}</span>
                      <LevelTrack level={skill.level} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section className="border-t border-border">
        <Link href="/experience" className="text-caption-sm text-primary hover:underline">
          See where these skills were applied, on the experience record →
        </Link>
      </Section>
    </>
  );
}
