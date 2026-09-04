import { apiGet } from "@/lib/api/client";
import { CACHE_TAGS, REVALIDATE } from "@/lib/api/config";
import type { ApiResult } from "@/lib/api/errors";
import type { SiteSettings } from "@/lib/api/types";

/** Singleton via get_or_create(pk=1) on the backend - always returns 200,
 * never 404 for "no settings configured". */
export async function getSiteSettings(): Promise<ApiResult<SiteSettings>> {
  return apiGet<SiteSettings>("/api/v1/public/site/settings/", {
    revalidate: REVALIDATE.siteSettings,
    tags: [CACHE_TAGS.siteSettings],
    retry: true,
  });
}
