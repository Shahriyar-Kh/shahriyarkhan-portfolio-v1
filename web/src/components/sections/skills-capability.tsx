"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryIcon, CoreStackIcon, categoryIconFor, coreStackIconFor } from "@/components/icons/tech-icons";
import { SectionIndex } from "@/components/motif/section-index";
import { LevelTrack } from "@/components/skills/level-track";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { groupSkillsByCategory } from "@/lib/skills";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { cn } from "@/lib/cn";
import type { Skill } from "@/lib/api/types";

export interface SkillsCapabilityProps {
  skills: readonly Skill[] | null;
}

/** The technologies the owner asked to headline as a "Core Stack" row -
 * matched against real skill names via coreStackIconFor(), so a skill
 * that doesn't actually exist in the fetched data (or a real category the
 * backend renamed) never renders a slot. This ordering is a display
 * preference only - it does not affect which skills exist or their real
 * levels. */
const CORE_STACK_ORDER: ReadonlyArray<keyof typeof CoreStackIcon> = ["Python", "Django", "PostgreSQL", "React", "Docker"];

/**
 * Section G - a capability console built entirely from real skill
 * categories (FINAL-DESIGN-01A-R2 §9, refined in R4 §E). No orbit
 * diagram, no percentages, no invented years. Within each category,
 * skills are sorted by their stored categorical level so higher-supported
 * entries read first. The public profile deliberately avoids arbitrary
 * percentages or invented years-of-experience claims.
 *
 * R4 adds: a Core Stack row for the verified primary technologies (only
 * ones actually present in the fetched data - see CORE_STACK_ORDER);
 * icon-labeled category chips/headers; a consistent hybrid icon per skill
 * row (its own Core Stack mark, or its category's mark as a fallback -
 * never a guessed logo, never a remote icon); and a one-time (not
 * looping, not scroll-scrubbed) rail fill-in tied to the same per-
 * category ScrollTrigger the capability-rule underline already uses.
 */
export function SkillsCapability({ skills }: SkillsCapabilityProps) {
  const groups = skills
    ? groupSkillsByCategory(skills).map((group) => ({
        ...group,
        skills: [...group.skills].sort((a, b) => b.level - a.level),
      }))
    : [];
  const coreStack = useMemo(() => {
    const bySlug = new Map<keyof typeof CoreStackIcon, Skill>();
    for (const skill of skills ?? []) {
      const key = coreStackIconFor(skill.name);
      if (key && !bySlug.has(key)) bySlug.set(key, skill);
    }
    return CORE_STACK_ORDER.filter((key) => bySlug.has(key)).map((key) => ({ key, skill: bySlug.get(key)! }));
  }, [skills]);

  const [activeCategory, setActiveCategory] = useState<number | null>(groups[0]?.categoryId ?? null);
  const sectionRefs = useRef(new Map<number, HTMLDivElement>());
  const rootRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: purely cosmetic (which category chip reads "active") -
  // never gates content. Every category's full skill list is always in
  // the DOM and always visible regardless of this state.
  useEffect(() => {
    if (groups.length === 0 || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          const id = Number(visible.target.getAttribute("data-category-id"));
          if (!Number.isNaN(id)) setActiveCategory(id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    for (const el of sectionRefs.current.values()) io.observe(el);
    return () => io.disconnect();
  }, [groups.length]);

  // FINAL-DESIGN-01A-R3: only the decorative capability-rule underline is
  // GSAP-scrubbed (continuous, non-`once`). R4 adds a second, separate
  // tween on the same per-category trigger: the rail (Node) marks scale
  // in once (not scrubbed, not looping, `once: true`) - real content
  // (skill names, levels) is never opacity-gated by either tween, per the
  // R3 motion hierarchy and to avoid the blank-content capture-mode risk
  // documented in lib/motion/use-scroll-reveal.ts.
  useScrollReveal(rootRef, (api) => {
    for (const el of sectionRefs.current.values()) {
      const rule = el.querySelector<HTMLElement>("[data-capability-rule]");
      if (rule) {
        api.gsap.to(rule, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", end: "top 50%", scrub: 0.5 },
        });
      }
      const nodes = el.querySelectorAll("[data-capability-node] svg");
      if (nodes.length > 0) {
        api.gsap.from(Array.from(nodes), {
          scale: 0,
          duration: 0.35,
          stagger: 0.02,
          ease: "back.out(2)",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      }
    }
  }, [groups.length]);

  return (
    <Section className="border-t border-border">
      <div className="flex items-end justify-between gap-4">
        <div>
          <SectionIndex n="07" label="Skills" className="mb-6" />
          <h2 className="text-display-sm text-ink-primary sm:text-display-md">Technical capability</h2>
        </div>
        <Link href="/skills" className="hidden shrink-0 text-body-sm font-medium text-primary hover:underline sm:inline">
          See the full breakdown →
        </Link>
      </div>
      <p className="mt-4 max-w-xl text-body text-ink-secondary">
        Grouped from the canonical backend record and connected to real project evidence. Levels stay categorical — never self-rated percentages or invented years-of-experience figures.
      </p>

      <div ref={rootRef} className="mt-10">
        {!skills ? (
          <EmptyState title="Skill data is temporarily unavailable." />
        ) : groups.length === 0 ? (
          <EmptyState title="No published skills yet." />
        ) : (
          <>
            {coreStack.length > 0 && (
              <div className="mb-10 border border-border bg-paper-raised p-5 sm:p-6">
                <p className="font-mono text-label text-ink-hint uppercase">Core stack</p>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {coreStack.map(({ key, skill }) => {
                    const Icon = CoreStackIcon[key];
                    return (
                      // flex-wrap (not a single unbreakable row) - found via
                      // FINAL-DESIGN-01A-R5's extreme-zoom audit: a pill this
                      // dense (icon + name + a 4-node rail + its level label)
                      // is wider than the ~260px effective viewport a phone
                      // screen zoomed to 150-200% actually presents, and
                      // without this the pill forced real page-level
                      // horizontal scroll rather than just wrapping its own
                      // second line.
                      <li
                        key={skill.id}
                        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border border-border bg-background px-3.5 py-2 text-clay"
                      >
                        <Icon size={20} />
                        <span className="text-body-sm font-semibold text-ink-primary">{skill.name}</span>
                        {/* No skillName here (unlike the full-breakdown
                         * instance below) - that prop drives LevelTrack's
                         * combined "{name} — {level}" aria-label, and this
                         * same skill's name is already visible text a few
                         * words to the left, so a screen reader would hear
                         * the pairing twice for no reason. The level label
                         * itself still reads normally either way. */}
                        <LevelTrack level={skill.level} className="text-ink-tertiary" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <nav aria-label="Skill categories" className="flex flex-wrap gap-2 border-b border-border pb-6">
              {groups.map((group) => {
                const Icon = CategoryIcon[categoryIconFor(group.categoryName)];
                return (
                  <a
                    key={group.categoryId}
                    href={`#skill-category-${group.categoryId}`}
                    className={cn(
                      "flex items-center gap-2 border px-3 py-1.5 font-mono text-caption-sm uppercase transition-colors duration-(--motion-fast)",
                      activeCategory === group.categoryId
                        ? "border-olive text-olive"
                        : "border-border text-ink-tertiary hover:border-olive/50 hover:text-ink-primary",
                    )}
                  >
                    <Icon size={14} />
                    {group.categoryName}
                  </a>
                );
              })}
            </nav>

            <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => {
                const GroupIcon = CategoryIcon[categoryIconFor(group.categoryName)];
                return (
                  <div
                    key={group.categoryId}
                    id={`skill-category-${group.categoryId}`}
                    data-category-id={group.categoryId}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(group.categoryId, el);
                      else sectionRefs.current.delete(group.categoryId);
                    }}
                    className="scroll-mt-28"
                  >
                    <div className="flex items-center gap-2 text-ink-primary">
                      <GroupIcon size={18} />
                      <p className="text-headline-sm">{group.categoryName}</p>
                    </div>
                    <span
                      aria-hidden
                      data-capability-rule
                      className="mt-2 block h-0.5 w-full origin-left scale-x-0 bg-olive/60"
                    />
                    <ul className="mt-4 flex flex-col gap-1">
                      {group.skills.map((skill, i) => {
                        const coreKey = coreStackIconFor(skill.name);
                        const RowIcon = coreKey ? CoreStackIcon[coreKey] : GroupIcon;
                        return (
                          <li
                            key={skill.id}
                            className={cn(
                              "group flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-2 transition-colors duration-(--motion-fast) hover:bg-olive/10",
                              i >= 3 && "opacity-80",
                            )}
                          >
                            <span className="flex items-center gap-2.5" aria-hidden="true">
                              <RowIcon
                                size={16}
                                className="shrink-0 text-ink-hint transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 group-hover:text-clay"
                              />
                              <span className={cn("text-body-sm text-ink-primary", i < 3 && "font-medium")}>{skill.name}</span>
                            </span>
                            <LevelTrack
                              level={skill.level}
                              skillName={skill.name}
                              nodeSize={7}
                              className="text-ink-tertiary transition-transform duration-(--motion-fast) group-hover:scale-105"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Link href="/skills" className="mt-8 inline-block text-body-sm font-medium text-primary hover:underline sm:hidden">
        See the full breakdown →
      </Link>
    </Section>
  );
}
