import { apiGet } from "@/lib/api/client";
import { CACHE_TAGS, REVALIDATE } from "@/lib/api/config";
import type { ApiResult } from "@/lib/api/errors";
import type { PageSeo } from "@/lib/api/types";

/** Unknown page_key -> 404 is EXPECTED (no draft/published concept on
 * this model - every seeded row is live, and an unseeded key just means
 * "no enhancement data", never an error). Treat this strictly as
 * enhancement over the code-level defaults in content/metadata.ts. */
export async function getPageSeo(pageKey: string): Promise<ApiResult<PageSeo>> {
  return apiGet<PageSeo>(`/api/v1/public/seo/pages/${encodeURIComponent(pageKey)}/`, {
    revalidate: REVALIDATE.pageSeo,
    tags: [CACHE_TAGS.pageSeo],
  });
}
