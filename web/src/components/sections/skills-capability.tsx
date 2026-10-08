"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CategoryIcon,
  CoreStackIcon,
  CORE_TECH_COLORS,
  categoryIconFor,
  coreStackIconFor,
} from "@/components/icons/tech-icons";
import { SectionIndex } from "@/components/motif/section-index";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { groupSkillsByCategory } from "@/lib/skills";
import { cn } from "@/lib/cn";
import type { Skill } from "@/lib/api/types";

export interface SkillsCapabilityProps {
  skills: readonly Skill[] | null;
}

/**
 * Exactly five primary technologies headlining the Core Tech row:
 * Python, Django, PostgreSQL, React.js, Docker.
 */
const CANONICAL_CORE_TECH: readonly { key: keyof typeof CoreStackIcon; displayName: string }[] = [
  { key: "Python", displayName: "Python" },
  { key: "Django", displayName: "Django" },
  { key: "PostgreSQL", displayName: "PostgreSQL" },
  { key: "React", displayName: "React.js" },
  { key: "Docker", displayName: "Docker" },
];

/**
 * The six canonical categories for the category selector:
 * Backend, Frontend, Database, Engineering, Tools, Deployment.
 */
const CANONICAL_CATEGORIES = [
  "Backend",
  "Frontend",
  "Database",
  "Engineering",
  "Tools",
  "Deployment",
] as const;

/**
 * Default initial 3 showcase categories:
 * 1. Frontend
 * 2. Backend
 * 3. Database
 */
const DEFAULT_SHOWCASE_CATEGORIES = ["Frontend", "Backend", "Database"];

/**
 * Section G - Technical Capability / Skills.
 * Three clear visual layers:
 * Row 1 - Core Tech: Exactly 5 technologies in one row on desktop with native icon colors.
 * Row 2 - Category Selector: Clean, accessible row of 6 categories.
 * Row 3 - Exactly 3 category cards at a time: Default Frontend, Backend, Database.
 *         Clicking another category swaps into one of the 3 visible positions.
 *
 * All dot scales, progress boxes, and level labels are removed. Only real technology
 * icons and names are displayed.
 */
export function SkillsCapability({ skills }: SkillsCapabilityProps) {
  const groups = useMemo(() => {
    if (!skills) return [];
    return groupSkillsByCategory(skills);
  }, [skills]);

  // Row 1: Core tech resolved from real skills
  const coreTech = useMemo(() => {
    if (!skills || skills.length === 0) return [];
    const result: { key: keyof typeof CoreStackIcon; displayName: string; skill: Skill }[] = [];
    for (const item of CANONICAL_CORE_TECH) {
      const match = skills.find((s) => coreStackIconFor(s.name) === item.key);
      if (match) {
        result.push({
          key: item.key,
          displayName: item.displayName,
          skill: match,
        });
      }
    }
    return result;
  }, [skills]);

  // Row 2: Category names available from data, ordered canonically
  const categoryList = useMemo(() => {
    if (groups.length === 0) return [];
    const names = groups.map((g) => g.categoryName);
    return names.sort((a, b) => {
      const aIdx = CANONICAL_CATEGORIES.findIndex((c) => c.toLowerCase() === a.toLowerCase());
      const bIdx = CANONICAL_CATEGORIES.findIndex((c) => c.toLowerCase() === b.toLowerCase());
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;
      return 0;
    });
  }, [groups]);

  // Row 3: Active showcase categories (always exactly 3 if data has >= 3)
  const [showcaseCategories, setShowcaseCategories] = useState<string[]>(DEFAULT_SHOWCASE_CATEGORIES);
  const [replaceSlot, setReplaceSlot] = useState<number>(2); // Default to replacing slot 3 (index 2)

  // Resolve active 3 groups
  const visibleGroups = useMemo(() => {
    if (groups.length === 0) return [];
    if (groups.length <= 3) return groups;

    const resolved: typeof groups = [];
    for (const catName of showcaseCategories) {
      const match = groups.find((g) => g.categoryName.toLowerCase() === catName.toLowerCase());
      if (match && !resolved.some((r) => r.categoryId === match.categoryId)) {
        resolved.push(match);
      }
    }
    // Fill up to 3 from remaining groups if needed
    for (const g of groups) {
      if (resolved.length >= 3) break;
      if (!resolved.some((r) => r.categoryId === g.categoryId)) {
        resolved.push(g);
      }
    }
    return resolved.slice(0, 3);
  }, [groups, showcaseCategories]);

  // Handle category selector click
  const handleCategorySelect = (categoryName: string) => {
    const existingIndex = visibleGroups.findIndex(
      (g) => g.categoryName.toLowerCase() === categoryName.toLowerCase(),
    );

    if (existingIndex >= 0) {
      // Category is already in the 3 cards
      return;
    }

    // Category is NOT in the 3 cards: swap into replaceSlot position
    const currentNames = visibleGroups.map((g) => g.categoryName);
    const targetIndex = replaceSlot >= 0 && replaceSlot < currentNames.length ? replaceSlot : (currentNames.length - 1);
    const nextNames = [...currentNames];
    nextNames[targetIndex] = categoryName;

    setShowcaseCategories(nextNames);
    setReplaceSlot((prev) => (prev + 1) % 3);
  };

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
        Engineering capabilities grounded in real systems delivery across backend APIs, relational data, and frontend architecture.
      </p>

      <div className="mt-10">
        {!skills ? (
          <EmptyState title="Skill data is temporarily unavailable." />
        ) : groups.length === 0 ? (
          <EmptyState title="No published skills yet." />
        ) : (
          <div className="flex flex-col gap-10">
            {/* ROW 1 — CORE TECH (exactly 5 technologies in one row on desktop) */}
            {coreTech.length > 0 && (
              <div className="border border-border bg-paper-raised p-5 sm:p-6 shadow-elevation-sm">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-label text-ink-hint uppercase">Core Stack</p>
                  <span className="font-mono text-caption text-ink-tertiary">Primary technologies</span>
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {coreTech.map(({ key, displayName, skill }) => {
                    const Icon = CoreStackIcon[key];
                    const brandColor = CORE_TECH_COLORS[displayName] || CORE_TECH_COLORS[key] || "var(--primary)";
                    return (
                      <li
                        key={skill.id}
                        className="flex items-center gap-3 border border-border bg-background px-4 py-3 shadow-2xs transition-colors duration-(--motion-fast) hover:border-border-strong"
                      >
                        <span
                          className="flex shrink-0 items-center justify-center"
                          style={{ color: brandColor }}
                          aria-hidden="true"
                        >
                          <Icon size={22} />
                        </span>
                        <span className="text-body-sm font-semibold text-ink-primary whitespace-nowrap">
                          {displayName}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ROW 2 — CATEGORY SELECTOR */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-label text-ink-hint uppercase">Explore Domains</p>
                <span className="text-caption text-ink-hint hidden sm:inline">Select a domain to showcase</span>
              </div>
              <nav aria-label="Skill categories" className="flex flex-wrap gap-2 border-b border-border pb-6">
                {categoryList.map((categoryName) => {
                  const Icon = CategoryIcon[categoryIconFor(categoryName)];
                  const isVisible = visibleGroups.some(
                    (g) => g.categoryName.toLowerCase() === categoryName.toLowerCase(),
                  );
                  return (
                    <button
                      type="button"
                      key={categoryName}
                      onClick={() => handleCategorySelect(categoryName)}
                      aria-pressed={isVisible}
                      className={cn(
                        "flex items-center gap-2 border px-3.5 py-2 font-mono text-caption-sm uppercase transition-colors duration-(--motion-fast) cursor-pointer select-none",
                        isVisible
                          ? "border-olive bg-olive/12 text-olive font-semibold shadow-2xs"
                          : "border-border bg-background text-ink-tertiary hover:border-olive/50 hover:text-ink-primary",
                      )}
                    >
                      <Icon size={15} />
                      <span>{categoryName}</span>
                      {isVisible && (
                        <span className="h-1.5 w-1.5 rounded-full bg-olive ml-0.5" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ROW 3 — ONLY THREE CATEGORY CARDS */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleGroups.map((group) => {
                const GroupIcon = CategoryIcon[categoryIconFor(group.categoryName)];

                return (
                  <div
                    key={group.categoryId}
                    data-category-card={group.categoryName}
                    className="flex flex-col border border-border bg-paper-raised p-5 sm:p-6 transition-all duration-(--motion-fast) shadow-elevation-sm hover:border-border-strong"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-3.5">
                      <div className="flex items-center gap-2.5 text-ink-primary">
                        <GroupIcon size={20} className="text-olive shrink-0" />
                        <h3 className="text-headline-sm font-semibold">{group.categoryName}</h3>
                      </div>
                      <span className="font-mono text-caption text-ink-hint">
                        {group.skills.length} skills
                      </span>
                    </div>

                    <ul className="mt-4 flex flex-1 flex-col divide-y divide-border/40">
                      {group.skills.map((skill) => {
                        const coreKey = coreStackIconFor(skill.name);
                        const RowIcon = coreKey ? CoreStackIcon[coreKey] : GroupIcon;
                        const brandColor = coreKey ? (CORE_TECH_COLORS[coreKey] || undefined) : undefined;
                        return (
                          <li
                            key={skill.id}
                            className="flex items-center gap-3 py-2.5 text-ink-primary transition-colors duration-(--motion-fast) hover:text-primary"
                          >
                            <span
                              className="flex shrink-0 items-center justify-center text-ink-hint"
                              aria-hidden="true"
                              style={brandColor ? { color: brandColor } : undefined}
                            >
                              <RowIcon size={16} />
                            </span>
                            <span className="text-body-sm font-medium">{skill.name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Link href="/skills" className="mt-8 inline-block text-body-sm font-medium text-primary hover:underline sm:hidden">
        See the full breakdown →
      </Link>
    </Section>
  );
}
