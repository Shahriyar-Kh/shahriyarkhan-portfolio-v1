/**
 * FINAL-DESIGN-01F-01: connects a real Experience record to a real
 * published project/case study - but only where an explicit, owner-
 * verified relationship exists. Unlike lib/skill-evidence.ts's
 * technology-token matching (a shared technology name is real evidence
 * of a *skill*, since the skill and the technology are the same fact),
 * a shared technology between an Experience role and a Project does NOT
 * establish that the project was built *during* that employment - so
 * this is deliberately a hand-curated, explicit map, never inferred.
 *
 * Audited at FINAL-DESIGN-01F-01 (2026-09-10): no real Project's
 * description, ai_summary, or verified case-study content
 * (content/case-studies/*.ts) names any of the 3 real employers (HA
 * Technologies, CodeAlpha, Abasyn University Incubation Center), and
 * Project has no relational field back to Experience. Zero verified
 * mappings exist today - this map stays empty rather than guessing from
 * the technology overlap alone. Add an entry only when the owner
 * confirms a specific published project was built during a specific
 * role.
 */
export const EXPERIENCE_EVIDENCE: Readonly<Record<number, readonly { slug: string; title: string }[]>> = {};

export function getExperienceEvidence(experienceId: number): readonly { slug: string; title: string }[] {
  return EXPERIENCE_EVIDENCE[experienceId] ?? [];
}
