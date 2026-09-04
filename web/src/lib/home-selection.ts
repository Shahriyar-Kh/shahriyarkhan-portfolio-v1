import { CASE_STUDIES, verifiedClaimCount } from "@/content/case-studies";
import { isDistinctRepoUrl } from "@/lib/format";
import type { Project } from "@/lib/api/types";

/**
 * Deterministic and evidence-driven, not hardcoded: prefers the project
 * whose claim register has the most verified claims, tie-broken by a
 * genuinely distinct repository URL (a tiebreaker that may never apply -
 * every project currently links only to the generic GitHub profile, see
 * lib/format.ts's isDistinctRepoUrl). If the underlying evidence changes
 * (a case study is deepened, or a project gains a real repo link), the
 * homepage's featured case follows automatically.
 */
export function selectFeaturedCase(projects: readonly Project[]): Project | null {
  const withEvidence = projects
    .filter((project) => CASE_STUDIES[project.slug])
    .map((project) => ({
      project,
      claimCount: verifiedClaimCount(CASE_STUDIES[project.slug]!),
      distinctRepo: isDistinctRepoUrl(project.github_url),
    }));

  if (withEvidence.length === 0) return projects[0] ?? null;

  withEvidence.sort((a, b) => {
    if (b.claimCount !== a.claimCount) return b.claimCount - a.claimCount;
    return Number(b.distinctRepo) - Number(a.distinctRepo);
  });

  return withEvidence[0]?.project ?? null;
}
