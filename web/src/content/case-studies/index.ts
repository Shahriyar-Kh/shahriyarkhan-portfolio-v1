import { advancedRms } from "@/content/case-studies/advanced-restaurant-management-system";
import { feelwise } from "@/content/case-studies/feelwise-emotion-detection-system";
import { noteassistAi } from "@/content/case-studies/noteassist-ai-productivity-platform";
import { nursesBeyondBorders } from "@/content/case-studies/nurses-beyond-borders-nclex-learning-platform";
import { portfolioPlatform } from "@/content/case-studies/portfolio-platform";
import { skLearntrack } from "@/content/case-studies/sk-learntrack-ai-learning-platform";
import { techBuiltOpenSchoolCurrent } from "@/content/case-studies/techbuilt-open-school-current";
import { techBuiltOpenSchoolFyp } from "@/content/case-studies/techbuilt-open-school-fyp";
import type { CaseSection, CaseStudy } from "@/content/case-studies/types";
import { yangoWingFleet } from "@/content/case-studies/yango-wing-fleet-digital-registration-platform";

/**
 * Case-study registry keyed by canonical Project.slug.
 *
 * Current flagship work is evidence-backed from public repositories,
 * public-safe case studies, or the owner-approved canonical profile.
 * The older restaurant project remains available as historical work but
 * should not outrank current backend/full-stack evidence.
 */
export const CASE_STUDIES: Readonly<Record<string, CaseStudy>> = {
  [nursesBeyondBorders.slug]: nursesBeyondBorders,
  [yangoWingFleet.slug]: yangoWingFleet,
  [noteassistAi.slug]: noteassistAi,
  [feelwise.slug]: feelwise,
  [portfolioPlatform.slug]: portfolioPlatform,
  [skLearntrack.slug]: skLearntrack,
  [techBuiltOpenSchoolCurrent.slug]: techBuiltOpenSchoolCurrent,
  [techBuiltOpenSchoolFyp.slug]: techBuiltOpenSchoolFyp,
  [advancedRms.slug]: advancedRms,
};

export function getCaseStudy(slug: string): CaseStudy | null {
  return CASE_STUDIES[slug] ?? null;
}

export function publishableClaims(section: CaseSection) {
  return section.claims.filter((c) => c.status === "verified" || c.status === "inferred");
}

/** A section with no publishable claims is dropped entirely. */
export function publishableSections(caseStudy: CaseStudy): CaseSection[] {
  return caseStudy.sections.filter((section) => publishableClaims(section).length > 0);
}

export function verifiedClaimCount(caseStudy: CaseStudy): number {
  return caseStudy.sections.reduce(
    (total, section) => total + section.claims.filter((c) => c.status === "verified").length,
    0,
  );
}
