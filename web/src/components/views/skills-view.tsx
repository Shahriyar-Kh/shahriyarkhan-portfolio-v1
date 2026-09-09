"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { CoreStackIcon, coreStackIconFor } from "@/components/icons/tech-icons";
import { SkillCategoryBand } from "@/components/sections/skill-category-band";
import { DualCta } from "@/components/sections/dual-cta";
import { LevelTrack } from "@/components/skills/level-track";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionIndex } from "@/components/motif/section-index";
import { SKILLS_INTRO, WORKING_RANGE } from "@/content/skills-page";
import type { Project, Skill } from "@/lib/api/types";
import { buildSkillEvidence } from "@/lib/skill-evidence";
import { groupSkillsByCategory } from "@/lib/skills";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

export interface SkillsViewProps {
  skills: readonly Skill[] | null;
  /** Null when the sibling fetch failed - the Evidence section simply
   * doesn't render rather than showing a broken or misleading link. */
  projects: readonly Project[] | null;
}

const CORE_STACK_ORDER: ReadonlyArray<keyof typeof CoreStackIcon> = ["Python", "Django", "PostgreSQL", "React", "Docker"];

/**
 * FINAL-DESIGN-01E-01 - the premium, standalone Skills page. Materially
 * richer than the homepage's own Skills section
 * (sections/skills-capability.tsx, untouched, not duplicated here):
 * this adds a real Evidence-from-real-work section (skills connected to
 * projects strictly through each project's own published technologies
 * field - lib/skill-evidence.ts) and a Working Range synthesis, neither
 * of which exists on the homepage. The Capability Index presents every
 * real skill as full-width editorial bands (SkillCategoryBand), not a
 * grid of bordered cards, and not the homepage's own 2-3 column layout.
 *
 * Every level renders as its real categorical label via LevelTrack,
 * never a fabricated percentage - the same discipline every other page
 * on this site uses.
 */
export function SkillsView({ skills, projects }: SkillsViewProps) {
  const groups = useMemo(() => (skills ? groupSkillsByCategory(skills) : []), [skills]);
  const evidence = useMemo(() => (skills && projects ? buildSkillEvidence(skills, projects) : []), [skills, projects]);
  const coreStack = useMemo(() => {
    const bySlug = new Map<keyof typeof CoreStackIcon, Skill>();
    for (const skill of skills ?? []) {
      const key = coreStackIconFor(skill.name);
      if (key && !bySlug.has(key)) bySlug.set(key, skill);
    }
    return CORE_STACK_ORDER.filter((key) => bySlug.has(key)).map((key) => ({ key, skill: bySlug.get(key)! }));
  }, [skills]);

  const rootRef = useRef<HTMLDivElement>(null);
  useScrollReveal(
    rootRef,
    (api) => {
      const rules = rootRef.current?.querySelectorAll<HTMLElement>("[data-index-rule]");
      if (!rules || rules.length === 0) return;
      api.gsap.to(Array.from(rules), {
        scaleX: 1,
        ease: "none",
        stagger: 0.08,
        scrollTrigger: { trigger: rootRef.current, start: "top 80%", end: "top 40%", scrub: 0.6 },
      });
    },
    [groups.length],
  );

  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <SectionHeading as="h1" eyebrow={SKILLS_INTRO.eyebrow} title={SKILLS_INTRO.title} subtitle={SKILLS_INTRO.lead} />
        {skills && skills.length > 0 && (
          <p className="mt-2 font-mono text-caption-sm text-ink-hint">
            {skills.length} published skill{skills.length === 1 ? "" : "s"} across {groups.length} categor{groups.length === 1 ? "y" : "ies"}
          </p>
        )}
      </Section>

      <Section className="border-t border-border">
        {!skills ? (
          <EmptyState title="Skill data is temporarily unavailable." description="Please try again shortly." />
        ) : skills.length === 0 ? (
          <EmptyState title="No published skills yet." />
        ) : (
          <>
            {coreStack.length > 0 && (
              <div className="mb-14">
                <p className="font-mono text-label text-ink-hint uppercase">Core stack</p>
                <ul className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5">
                  {coreStack.map(({ key, skill }, i) => {
                    const Icon = CoreStackIcon[key];
                    return (
                      <li key={skill.id} className="flex items-center gap-3">
                        {i > 0 && <span aria-hidden className="hidden h-8 w-px bg-border sm:-ml-4 sm:block" />}
                        <Icon size={24} className="text-clay" />
                        <div>
                          <p className="text-body-sm font-semibold text-ink-primary">{skill.name}</p>
                          <LevelTrack level={skill.level} className="text-ink-tertiary" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div ref={rootRef}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <SectionIndex n="01" label="Index" className="mb-4" />
                  <h2 className="text-headline-lg text-ink-primary">Capability index</h2>
                </div>
              </div>
              <span aria-hidden data-index-rule className="mt-4 block h-0.5 w-full origin-left scale-x-0 bg-clay/50" />
              <div className="mt-2">
                {groups.map((group) => (
                  <SkillCategoryBand key={group.categoryId} group={group} />
                ))}
              </div>
            </div>

            {evidence.length > 0 && (
              <div className="mt-16">
                <SectionIndex n="02" label="Evidence" className="mb-4" />
                <h2 className="text-headline-lg text-ink-primary">Evidence from real work</h2>
                <p className="mt-3 max-w-xl text-body-sm text-ink-secondary">
                  Skills below are connected to a published project only where that project&apos;s own technology record supports it - never a
                  guessed relationship.
                </p>
                <ul className="mt-6 flex flex-col gap-4">
                  {evidence.map(({ skill, projects: relatedProjects }) => (
                    <li key={skill.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border pt-4">
                      <span className="min-w-32 text-body-sm font-medium text-ink-primary">{skill.name}</span>
                      <span className="text-caption-sm text-ink-hint">
                        {relatedProjects.map((project, i) => (
                          <span key={project.slug}>
                            {i > 0 && ", "}
                            <Link href={`/work/${project.slug}`} className="text-primary hover:underline">
                              {project.title}
                            </Link>
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-16">
              <SectionIndex n="03" label="Range" className="mb-4" />
              <h2 className="text-headline-lg text-ink-primary">Working range</h2>
              <p className="mt-3 max-w-xl text-body-sm text-ink-secondary">
                The end-to-end capability this skill set actually supports today.
              </p>
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                {WORKING_RANGE.map((item, i) => (
                  <div key={item.title} className="border-t border-border pt-4">
                    <span className="font-mono text-caption text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
                    <p className="mt-1.5 text-headline-sm text-ink-primary">{item.title}</p>
                    <p className="mt-2 text-body-sm text-ink-secondary">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>

      <DualCta />
    </>
  );
}
