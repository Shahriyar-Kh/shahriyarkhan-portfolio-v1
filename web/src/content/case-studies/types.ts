/**
 * The claim register. Every stated fact in a case study is classified so
 * an unverifiable claim can never silently reach the page - see
 * docs/rebuild/P01_BRAND_DIRECTION.md and CONTENT_TRUTH_INVENTORY.md.
 */
export type ClaimStatus = "verified" | "inferred" | "pending" | "prohibited";

export interface Claim {
  readonly id: string;
  /** The sentence exactly as it may appear on the page. */
  readonly statement: string;
  readonly status: ClaimStatus;
  /** A file path, an audit doc + section, a live URL + check date, or
   * "owner-approved <date>". Never empty for a `verified` claim
   * (test-enforced in case-studies.test.ts). */
  readonly evidence: string;
  readonly note?: string;
}

export type CaseSectionKey =
  | "context"
  | "problem"
  | "constraints"
  | "responsibility"
  | "architecture"
  | "decisions"
  | "security"
  | "features"
  | "status"
  | "outcome";

export interface CaseSection {
  readonly key: CaseSectionKey;
  readonly heading: string;
  /** Only verified|inferred claims are ever rendered - see
   * publishableClaims() in index.ts. */
  readonly claims: readonly Claim[];
}

export interface EvidenceLink {
  readonly kind: "live" | "repo" | "screenshot";
  readonly label: string;
  readonly href: string;
  /** ISO date last confirmed reachable, or null if not independently
   * re-checked in this phase. */
  readonly verifiedOn: string | null;
  /** For screenshots - OPEN_DECISIONS.md #14 flags several as possibly
   * stale (April 2026 timestamps). */
  readonly capturedApprox?: string;
}

export interface CaseStudy {
  /** Must equal the live API Project.slug (test-enforced). */
  readonly slug: string;
  /** Never a metric, never a superlative. */
  readonly summary: string;
  readonly sections: readonly CaseSection[];
  readonly evidence: readonly EvidenceLink[];
  /** Claims recorded but deliberately NOT rendered - the register's
   * whole point. Keeping them in-file makes the rejection reviewable
   * instead of invisible. */
  readonly withheld: readonly Claim[];
  /** Rendered verbatim under "What this page does not claim." */
  readonly limitations: readonly string[];
  readonly lastReviewed: string;
}
