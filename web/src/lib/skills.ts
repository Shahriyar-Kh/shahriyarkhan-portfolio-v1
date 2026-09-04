import type { Skill } from "@/lib/api/types";

export interface SkillCategoryGroup {
  categoryId: number;
  categoryName: string;
  skills: Skill[];
}

/**
 * Groups a flat skill list by category, ordered by the category's own
 * display_order (falling back to first-seen order for a tie) - never
 * re-sorted alphabetically, since display_order is the owner-curated
 * presentation order the backend already encodes.
 */
export function groupSkillsByCategory(skills: readonly Skill[]): SkillCategoryGroup[] {
  const groups = new Map<number, SkillCategoryGroup>();

  for (const skill of skills) {
    const existing = groups.get(skill.category.id);
    if (existing) {
      existing.skills.push(skill);
    } else {
      groups.set(skill.category.id, {
        categoryId: skill.category.id,
        categoryName: skill.category.name,
        skills: [skill],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aOrder = skills.find((s) => s.category.id === a.categoryId)?.category.display_order ?? 0;
    const bOrder = skills.find((s) => s.category.id === b.categoryId)?.category.display_order ?? 0;
    return aOrder - bOrder;
  });
}
