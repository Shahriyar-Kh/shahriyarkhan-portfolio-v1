import { apiGet, apiPost } from "@/lib/api/client";
import { CACHE_TAGS, REVALIDATE } from "@/lib/api/config";
import type { ApiResult } from "@/lib/api/errors";
import type { ResumeVersion } from "@/lib/api/types";

/** 404 body {"detail":"No published default resume is configured."} is a
 * VALID, EXPECTED state, not a bug - see lib/resume-page-state.ts for how
 * every failure mode of this call is handled identically (fall back to
 * composing from the individual list endpoints). */
export async function getDefaultResume(): Promise<ApiResult<ResumeVersion>> {
  return apiGet<ResumeVersion>("/api/v1/public/resume/default/", {
    revalidate: REVALIDATE.resume,
    tags: [CACHE_TAGS.resume],
  });
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
