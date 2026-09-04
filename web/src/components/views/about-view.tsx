import Image from "next/image";
import Link from "next/link";
import { Node } from "@/components/motif/node";
import { Reveal } from "@/components/layout/reveal";
import { DualCta } from "@/components/sections/dual-cta";
import { SystemMapSection } from "@/components/sections/system-map-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  ABOUT_CAREER_STORY,
  ABOUT_INTRO,
  ABOUT_LANGUAGES,
  ABOUT_PREVIEW_CTA,
  ABOUT_PRINCIPLES,
  ABOUT_RECORD_PREVIEW_CTA,
  ABOUT_SPECIALIZATION_FALLBACK,
  ABOUT_STRENGTHS_CTA,
} from "@/content/about";
import type { Education, Experience, Skill } from "@/lib/api/types";
import { formatDateRange, formatMonthYear } from "@/lib/format";
import { groupSkillsByCategory } from "@/lib/skills";

export interface AboutViewProps {
  skills: readonly Skill[] | null;
  experiences: readonly Experience[] | null;
  education: readonly Education[] | null;
  /** Prefers the live SiteSetting.hero_subtitle - see content/about.ts's
   * ABOUT_SPECIALIZATION_FALLBACK doc comment for why. */
  specialization: string | null;
}

export function AboutView({ skills, experiences, education, specialization }: AboutViewProps) {
  const strengthGroups = skills ? groupSkillsByCategory(skills).slice(0, 4) : [];
  const recentExperience = experiences?.slice(0, 2) ?? [];
  const recentEducation = education?.slice(0, 1) ?? [];

  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <SectionHeading eyebrow={ABOUT_INTRO.eyebrow} title={ABOUT_INTRO.title} subtitle={ABOUT_INTRO.lead} />
      </Section>

      <Reveal>
        <Section className="border-t border-border">
          <div className="grid gap-10 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
            <div className="relative aspect-square w-full max-w-[220px] overflow-hidden bg-surface">
              <Image src="/images/profile.png" alt="Portrait of Shahriyar Khan" fill sizes="220px" className="object-cover" />
            </div>
            <div>
              <h2 className="text-headline-md text-ink-primary">{specialization || ABOUT_SPECIALIZATION_FALLBACK}</h2>
              <div className="mt-4 flex flex-col gap-4">
                {ABOUT_CAREER_STORY.map((paragraph) => (
                  <p key={paragraph} className="max-w-2xl text-body-sm text-ink-secondary">
                    {paragraph}
                  </p>
                ))}
              </div>
              {ABOUT_LANGUAGES.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {ABOUT_LANGUAGES.map((language) => (
                    <li key={language}>
                      <Badge>{language}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      </Reveal>

      <Reveal>
        <Section className="border-t border-border">
          <SectionHeading eyebrow="Approach" title="Engineering principles" />
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {ABOUT_PRINCIPLES.map((principle) => (
              <div key={principle.title} className="border-t border-border pt-4">
                <p className="text-headline-sm text-ink-primary">{principle.title}</p>
                <p className="mt-2 text-body-sm text-ink-secondary">{principle.body}</p>
              </div>
            ))}
          </div>
        </Section>
      </Reveal>

      <Section className="border-t border-border">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Record" title="Experience and education" subtitle="The full structured record lives on its own page." />
        </div>
        <div className="mt-8">
          {!experiences || !education ? (
            <EmptyState title="Experience and education data is temporarily unavailable." />
          ) : recentExperience.length === 0 && recentEducation.length === 0 ? (
            <EmptyState title="No published experience or education yet." />
          ) : (
            <div className="grid gap-8 sm:grid-cols-2">
              {recentExperience.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {recentExperience.map((role) => (
                    <li key={role.id} className="border-t border-border pt-4">
                      <div className="flex items-center gap-2">
                        <Node filled={role.current_role} />
                        <p className="text-body-sm font-medium text-ink-primary">
                          {role.role_title} — {role.company_name}
                        </p>
                      </div>
                      <p className="mt-1 text-caption-sm text-ink-tertiary">
                        {formatDateRange(role.start_date, role.end_date, role.current_role)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {recentEducation.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {recentEducation.map((item) => (
                    <li key={item.id} className="border-t border-border pt-4">
                      <p className="text-body-sm font-medium text-ink-primary">{item.degree}</p>
                      <p className="text-caption-sm text-ink-tertiary">
                        {item.institution} · {formatMonthYear(item.start_date)} —{" "}
                        {item.end_date ? formatMonthYear(item.end_date) : "Present"}
                      </p>
                      {item.description && <p className="mt-1 text-caption-sm text-ink-hint">{item.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <Link href={ABOUT_RECORD_PREVIEW_CTA.href} className="mt-6 inline-block text-caption-sm text-primary hover:underline">
          {ABOUT_RECORD_PREVIEW_CTA.label} →
        </Link>
      </Section>

      <Section className="border-t border-border">
        <SectionHeading eyebrow="Coverage" title="Core strengths and technology coverage" />
        <div className="mt-8">
          {!skills ? (
            <EmptyState title="Skill data is temporarily unavailable." />
          ) : strengthGroups.length === 0 ? (
            <EmptyState title="No published skills yet." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {strengthGroups.map((group) => (
                <div key={group.categoryId}>
                  <p className="text-label text-accent uppercase">{group.categoryName}</p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {group.skills.slice(0, 5).map((skill) => (
                      <li key={skill.id} className="text-body-sm text-ink-secondary">
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link href={ABOUT_STRENGTHS_CTA.href} className="mt-6 inline-block text-caption-sm text-primary hover:underline">
          {ABOUT_STRENGTHS_CTA.label} →
        </Link>
      </Section>

      <SystemMapSection skills={skills} />

      <Section className="border-t border-border">
        <Button href={ABOUT_PREVIEW_CTA.href} data-analytics-event="project_cta_click">
          {ABOUT_PREVIEW_CTA.label}
        </Button>
      </Section>

      <DualCta />
    </>
  );
}
