import { advancedRms } from "@/content/case-studies/advanced-restaurant-management-system";
import { feelwise } from "@/content/case-studies/feelwise-emotion-detection-system";
import { noteassistAi } from "@/content/case-studies/noteassist-ai-productivity-platform";
import { skLearntrack } from "@/content/case-studies/sk-learntrack-ai-learning-platform";
import type { CaseSection, CaseStudy } from "@/content/case-studies/types";
import { yangoWingFleet } from "@/content/case-studies/yango-wing-fleet-digital-registration-platform";

/**
 * Keyed by the live API's Project.slug. techbuilt-open-school-lms is
 * deliberately absent: it has no live_url, no distinct github_url, no
 * images, and zero linked technologies despite claiming a "production-
 * ready" stack in its own description - it was not covered by the
 * original P00 content-truth audit, and authoring a claim register for
 * it now would mean inventing confidence this project doesn't have
 * evidence for. It still renders via the plain API-only path (title,
 * description, technologies, links - all empty/absent render honestly
 * as absent), same as any project with no register entry.
 * See docs/rebuild/P01_BACKEND_EVOLUTION_PLAN.md.
 */
export const CASE_STUDIES: Readonly<Record<string, CaseStudy>> = {
  [yangoWingFleet.slug]: yangoWingFleet,
  [noteassistAi.slug]: noteassistAi,
  [skLearntrack.slug]: skLearntrack,
  [feelwise.slug]: feelwise,
  [advancedRms.slug]: advancedRms,
};

export function getCaseStudy(slug: string): CaseStudy | null {
  return CASE_STUDIES[slug] ?? null;
}

export function publishableClaims(section: CaseSection) {
  return section.claims.filter((c) => c.status === "verified" || c.status === "inferred");
}

/** A section with no publishable claims is dropped entirely - no empty
 * shells with a heading and nothing under it. */
export function publishableSections(caseStudy: CaseStudy): CaseSection[] {
  return caseStudy.sections.filter((section) => publishableClaims(section).length > 0);
}

export function verifiedClaimCount(caseStudy: CaseStudy): number {
  return caseStudy.sections.reduce(
    (total, section) => total + section.claims.filter((c) => c.status === "verified").length,
    0,
  );
}
