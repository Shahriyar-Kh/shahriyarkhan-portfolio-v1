import { apiGet, apiPost, apiUrl } from "@/lib/api/client";
import { CACHE_TAGS, REVALIDATE } from "@/lib/api/config";
import type { ApiResult } from "@/lib/api/errors";
import type { ResumeVersion } from "@/lib/api/types";

export type ResumeDownloadFormat = "pdf" | "docx";

/** The stable current-master download route (B7): always resolves to
 * whichever version is currently the published default master - never a
 * specific version id, so the link stays correct across a republish.
 * Native browser navigation only - never fetched/blobbed from the
 * client, so the server's Content-Disposition drives the real download
 * and no separate tracking call is needed (the backend tracks a real
 * successful GET itself; see PublicResumeDefaultDownloadView). */
export function getResumeDownloadUrl(format: ResumeDownloadFormat): string {
  return apiUrl(`/api/v1/public/resume/default/download/${format}/`);
}

/** 404 body {"detail":"No published default resume is configured."} is a
 * VALID, EXPECTED state, not a bug - see lib/resume-page-state.ts for how
 * every failure mode of this call is handled identically (fall back to
 * composing from the individual list endpoints).
 *
 * B7-RC correction 2: deliberately `cache: "no-store"`, NOT the
 * REVALIDATE.resume/CACHE_TAGS.resume ISR window every other resource
 * uses - a newly published master must appear on the very next request,
 * not up to an hour later. Paired with `export const dynamic =
 * "force-dynamic"` on app/resume/page.tsx so the route itself is never
 * statically optimized or baked at build time. */
export async function getDefaultResume(): Promise<ApiResult<ResumeVersion>> {
  return apiGet<ResumeVersion>("/api/v1/public/resume/default/", { cache: "no-store" });
}

export async function getResume(slug: string): Promise<ApiResult<ResumeVersion>> {
  return apiGet<ResumeVersion>(`/api/v1/public/resume/${encodeURIComponent(slug)}/`, {
    revalidate: REVALIDATE.resume,
    tags: [CACHE_TAGS.resume],
  });
}

/** Fire-and-forget from the client - a failure must never block or delay
 * the PDF download itself. Not called in this phase (see
 * lib/resume-page-state.ts for why); kept ready for a future phase. */
export async function trackResumeDownload(
  slug: string,
  source?: string,
): Promise<ApiResult<{ message: string; resume: string }>> {
  return apiPost(`/api/v1/public/resume/${encodeURIComponent(slug)}/download-track/`, { source });
}
