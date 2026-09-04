import { publishableSections } from "@/content/case-studies";
import type { CaseSection, CaseStudy, EvidenceLink } from "@/content/case-studies/types";
import type { ProjectWithOptionalCaseStudy } from "@/lib/api/types";

interface ApiCaseSection {
  key: string;
  heading: string;
  body: string;
}

export interface ResolvedCaseContent {
  readonly apiSections: readonly ApiCaseSection[];
  readonly editorialSections: readonly CaseSection[];
  readonly evidence: readonly EvidenceLink[];
  readonly limitations: readonly string[];
  readonly isEmpty: boolean;
}

const API_CANDIDATES: { key: "overview" | "problem" | "solution" | "outcome" | "challenge"; heading: string }[] = [
  { key: "overview", heading: "Context" },
  { key: "problem", heading: "The challenge" },
  { key: "solution", heading: "Approach" },
  { key: "outcome", heading: "Outcome" },
  { key: "challenge", heading: "Constraints" },
];

function hasContent(value: string | string[] | undefined): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.some((v) => v.trim().length > 0);
  return value.trim().length > 0;
}

/**
 * The live API wins for any section key it supplies - the editorial
 * claim register is self-retiring, not a permanent second CMS. It exists
 * only because overview/problem/solution/outcome don't exist on the
 * backend today (docs/rebuild/P01_BACKEND_EVOLUTION_PLAN.md); the day
 * the backend gains one of these fields, the API's version renders and
 * the register's corresponding section is suppressed (the register entry
 * stays in its file only as historical record).
 */
export function resolveCaseContent(
  project: ProjectWithOptionalCaseStudy,
  caseStudy: CaseStudy | null,
): ResolvedCaseContent {
  // All five API_CANDIDATES keys are string-typed fields on
  // ProjectCaseStudyFields (development_highlights, the only array-typed
  // field, is deliberately not one of them) - so no array handling is
  // needed here.
  const apiSections: ApiCaseSection[] = [];
  for (const candidate of API_CANDIDATES) {
    const body = project[candidate.key];
    if (typeof body === "string" && hasContent(body)) {
      apiSections.push({ key: candidate.key, heading: candidate.heading, body });
    }
  }

  const apiKeys = new Set(apiSections.map((s) => s.key));
  // The register's context/problem/solution/outcome/constraints map onto
  // the same conceptual slots as the API fields above - suppress a
  // register section if the API already supplies that concept.
  const REGISTER_TO_API_KEY: Partial<Record<string, string>> = {
    context: "overview",
    problem: "problem",
    decisions: "solution",
    outcome: "outcome",
    constraints: "challenge",
  };

  const editorialSections = caseStudy
    ? publishableSections(caseStudy).filter((section) => {
        const apiKey = REGISTER_TO_API_KEY[section.key];
        return !apiKey || !apiKeys.has(apiKey);
      })
    : [];

  const evidence = caseStudy?.evidence ?? [];
  const limitations = caseStudy?.limitations ?? [];

  return {
    apiSections,
    editorialSections,
    evidence,
    limitations,
    isEmpty: apiSections.length === 0 && editorialSections.length === 0,
  };
}
