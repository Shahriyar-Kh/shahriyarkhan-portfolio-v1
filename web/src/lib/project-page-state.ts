import type { ApiResult } from "@/lib/api/errors";
import type { Project } from "@/lib/api/types";

export type ProjectPageState =
  | { kind: "not_found" }
  | { kind: "unavailable"; message: string }
  | { kind: "ready"; project: Project };

/**
 * Isolates the one branch that matters for crawlers: notFound() must
 * fire ONLY for a genuine 404 (including InsightBoard's draft-status
 * row, which the backend already excludes from the public queryset - no
 * manual exclusion list needed here). A timeout or 5xx must NOT emit a
 * 404 - that would tell crawlers a real, published project no longer
 * exists. Kept as a pure function so this distinction is unit-testable
 * without Next's notFound() (which throws a special digest error RTL
 * can't meaningfully assert on).
 */
export function resolveProjectPageState(result: ApiResult<Project>): ProjectPageState {
  if (result.ok) return { kind: "ready", project: result.data };
  if (result.error.kind === "not_found") return { kind: "not_found" };
  return { kind: "unavailable", message: result.error.message };
}
