import type { Project, Skill } from "@/lib/api/types";

export interface SkillEvidenceEntry {
  skill: Skill;
  projects: readonly { slug: string; title: string }[];
}

/** Below this length a token risks a false-positive substring match
 * against an unrelated technology name - real skill/tech tokens in this
 * dataset are all well above it, but the guard costs nothing. */
const MIN_TOKEN_LENGTH = 3;

function skillTokens(skillName: string): string[] {
  return skillName
    .split("/")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

function normalize(value: string): string {
  // "React.js" and "React" are the same real technology - the only
  // normalization applied is stripping a trailing ".js", never a
  // guessed/invented equivalence.
  return value.toLowerCase().replace(/\.js$/, "");
}

function skillMatchesProject(skill: Skill, project: Project): boolean {
  const tokens = skillTokens(skill.name).map(normalize);
  return project.technologies.some((tech) => {
    const t = normalize(tech.name);
    return tokens.some((token) => t === token || t.includes(token) || token.includes(t));
  });
}

/**
 * FINAL-DESIGN-01E-01: connects real skills to real projects strictly
 * through each project's own published `technologies` field - never a
 * hand-maintained lookup table, so the relationship can never drift out
 * of sync with either dataset. Matching is substring/token-based (the
 * same approach lib/format.ts's isDistinctRepoUrl and tech-icons.tsx's
 * coreStackIconFor already use elsewhere in this codebase), with only
 * one normalization rule (a trailing ".js", e.g. "React.js" ~ "React")
 * - never a guessed equivalence between genuinely different
 * technologies. A skill with no matching project's technology field is
 * simply absent from the result - never a fabricated relationship.
 */
export function buildSkillEvidence(skills: readonly Skill[], projects: readonly Project[]): SkillEvidenceEntry[] {
  const entries: SkillEvidenceEntry[] = [];
  for (const skill of skills) {
    const matches = projects
      .filter((project) => skillMatchesProject(skill, project))
      .map((project) => ({ slug: project.slug, title: project.title }));
    if (matches.length > 0) entries.push({ skill, projects: matches });
  }
  return entries;
}
