import type { ApiResult } from "@/lib/api/errors";

/**
 * FINAL-DESIGN-01A-R6-FIX / R6-FIX2 (originally homepage-only; generalized
 * at EXPERIENCE-DATA-01 into a shared guard for any list-aggregating page):
 * guards Next's ISR "stale-while-error" safety net (documented in this
 * repo's own
 * node_modules/next/dist/docs/01-app/02-guides/incremental-static-regeneration.md
 * under "Handling uncaught exceptions": a thrown render error keeps the
 * last successfully generated page serving and retries on the next
 * request/revalidation - it never replaces good content with a broken
 * render).
 *
 * Without this guard, a page that catches every fetch error into `null`
 * and still returns a normal 200 render (the honest per-section
 * "temporarily unavailable" fallback UI) is indistinguishable, to Next's
 * ISR, from a legitimate successful page. A transient cold-start failure
 * during `next build` or a background revalidation can therefore silently
 * get baked into the static/ISR output and keep serving stale "data
 * unavailable" content long after the real API has recovered -
 * EXPERIENCE-DATA-01 confirmed this exact failure mode on /experience:
 * no guard existed, both getExperiences() and getEducation() failures
 * rendered as a normal 200 EmptyState page, and a live re-check found the
 * real API fully healthy (fast /healthz and both endpoints returning real
 * data) - consistent with a since-recovered transient failure (Railway
 * cold start) having been cached while the guard was absent.
 *
 * **Any single required dataset** failing with a protected error aborts
 * the whole render, so the previous last-known-good page (which had
 * every section correct) keeps serving instead of a hybrid page where
 * only some sections are trustworthy.
 *
 * A failure only "protects" (aborts the render) when it is one of:
 * - `"network"` - connection refused/DNS/offline.
 * - `"timeout"` - the cold-start signature.
 * - `"invalid_response"` - a 2xx whose body wasn't parseable JSON (state 4,
 *   schema-invalid).
 * - `"http"` with `status >= 500` - a real server-side failure (state 3).
 *
 * A `"http"` error below 500 (a real 4xx on a list endpoint would be a
 * genuine, addressable client-side bug, not a transient condition) and
 * `"not_found"`/`"validation"`/`"not_configured"` never abort - those are
 * either not applicable to these GET-list calls or represent a distinct,
 * permanent condition that should surface immediately rather than being
 * masked behind a stale cache forever.
 *
 * A **legitimate successful empty response** (`ok: true, data: []`)
 * never aborts, unless that specific dataset is marked
 * `requiredNonEmpty` - reserved for a dataset where zero real records
 * would itself be a sign something is broken. No current caller marks a
 * dataset this way: a portfolio can legitimately have zero of any given
 * record type at some point in its real lifecycle, and that must still
 * render as an honest "no items yet" empty state, not an error.
 */
export interface RequiredDataset {
  /** Short, human-readable name for diagnostics only (e.g. "projects") -
   * never a secret, safe to log. */
  name: string;
  result: ApiResult<unknown>;
  /** True only for a dataset that must never legitimately be empty. See
   * the module doc above - unused by any current caller. */
  requiredNonEmpty?: boolean;
}

function isAbortingFailure(dataset: RequiredDataset): boolean {
  const { result, requiredNonEmpty } = dataset;

  if (result.ok) {
    if (requiredNonEmpty && Array.isArray(result.data) && result.data.length === 0) {
      return true;
    }
    return false;
  }

  const { kind, status } = result.error;
  if (kind === "network" || kind === "timeout" || kind === "invalid_response") return true;
  if (kind === "http" && status !== null && status >= 500) return true;
  return false;
}

export function assertRequiredDatasetsAvailable(datasets: readonly RequiredDataset[]): void {
  for (const dataset of datasets) {
    if (isAbortingFailure(dataset)) {
      const detail = dataset.result.ok
        ? "returned a legitimate-shaped but unexpectedly empty response for a dataset marked required-non-empty"
        : `failed with a "${dataset.result.error.kind}" error${dataset.result.error.status !== null ? ` (status ${dataset.result.error.status})` : ""}`;
      throw new Error(
        `Required page data unavailable: dataset "${dataset.name}" ${detail} - refusing to render a partial page. If a previously successful static/ISR render exists, Next.js will keep serving it and retry on the next request.`,
      );
    }
  }
}
