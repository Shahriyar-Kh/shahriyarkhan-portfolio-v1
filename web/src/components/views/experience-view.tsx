import { Node } from "@/components/motif/node";
import { Tick } from "@/components/motif/tick";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SKILL_LEVEL_LABELS } from "@/lib/api/types";
import type { Education, Experience, Skill } from "@/lib/api/types";
import { formatDateRange, formatMonthYear } from "@/lib/format";

export interface ExperienceViewProps {
  experiences: readonly Experience[] | null;
  education: readonly Education[] | null;
  skills: readonly Skill[] | null;
}

/**
 * The full structured record - distinct from /about's narrative preview
 * and /resume's document view. Skill levels render as SKILL_LEVEL_LABELS
 * word labels (Beginner/Intermediate/Advanced/Expert), never as a
 * percentage bar (a self-rated number with arbitrary precision would be
 * an invented-confidence pattern - see the design research doc).
 */
export function ExperienceView({ experiences, education, skills }: ExperienceViewProps) {
  const skillsByCategory = new Map<string, Skill[]>();
  for (const skill of skills ?? []) {
    const key = skill.category.name;
    const bucket = skillsByCategory.get(key) ?? [];
    bucket.push(skill);
    skillsByCategory.set(key, bucket);
  }

  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <SectionHeading eyebrow="Experience" title="The structured record" subtitle="Roles, companies, education, and the skills behind the case studies." />
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Employment</h2>
        <div className="mt-6">
          {!experiences ? (
            <EmptyState title="Experience data is temporarily unavailable." />
          ) : experiences.length === 0 ? (
            <EmptyState title="No published experience yet." />
          ) : (
            <ol className="flex flex-col gap-8 border-l border-border pl-6">
              {experiences.map((role) => (
                <li key={role.id} className="relative">
                  <Node filled={role.current_role} className="absolute top-1.5 -left-[calc(1.5rem+3px)]" />
                  <p className="text-headline-sm text-ink-primary">{role.role_title}</p>
                  <p className="text-body-sm text-ink-secondary">
                    {role.company_name}
                    {role.location ? ` — ${role.location}` : ""}
                  </p>
                  <Tick className="mt-1">{formatDateRange(role.start_date, role.end_date, role.current_role)}</Tick>
                  {role.description && <p className="mt-3 max-w-2xl text-body-sm text-ink-secondary">{role.description}</p>}
                  {role.achievements.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {role.achievements.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-body-sm text-ink-secondary">
                          <Node aria-hidden className="mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {role.technologies.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {role.technologies.map((tech) => (
                        <li key={tech.id}>
                          <Badge>{tech.name}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Education</h2>
        <div className="mt-6">
          {!education ? (
            <EmptyState title="Education data is temporarily unavailable." />
          ) : education.length === 0 ? (
            <EmptyState title="No published education record yet." />
          ) : (
            <ul className="flex flex-col gap-6">
              {education.map((item) => (
                <li key={item.id} className="border-t border-border pt-4">
                  <p className="text-headline-sm text-ink-primary">{item.degree}</p>
                  <p className="text-body-sm text-ink-secondary">{item.institution}</p>
                  <Tick className="mt-1">
                    {formatMonthYear(item.start_date)} — {item.end_date ? formatMonthYear(item.end_date) : "Present"}
                  </Tick>
                  {item.description && <p className="mt-2 max-w-2xl text-body-sm text-ink-secondary">{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Skills</h2>
        <div className="mt-6">
          {!skills ? (
            <EmptyState title="Skill data is temporarily unavailable." />
          ) : skills.length === 0 ? (
            <EmptyState title="No published skills yet." />
          ) : (
            <div className="grid gap-8 sm:grid-cols-2">
              {Array.from(skillsByCategory.entries()).map(([category, categorySkills]) => (
                <div key={category}>
                  <p className="text-label text-accent uppercase">{category}</p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {categorySkills.map((skill) => (
                      <li key={skill.id} className="flex items-center justify-between gap-4 text-body-sm">
                        <span className="text-ink-primary">{skill.name}</span>
                        <span className="font-mono text-caption-sm text-ink-tertiary">
                          {SKILL_LEVEL_LABELS[skill.level]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
