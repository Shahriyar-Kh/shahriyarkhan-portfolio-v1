import { apiGet, apiGetList } from "@/lib/api/client";
import { CACHE_TAGS, REVALIDATE } from "@/lib/api/config";
import type { ApiResult } from "@/lib/api/errors";
import type { Education, Experience, Project, Service, Skill } from "@/lib/api/types";

export async function getProjects(): Promise<ApiResult<Project[]>> {
  // Backend already filters status=published - this client adds NO
  // exclusion logic (InsightBoard is a draft row and never appears here).
  // Meta.ordering ("display_order", "-created_at") - do not re-sort,
  // except a caller's own explicit featured-first pass.
  return apiGetList<Project>("/api/v1/public/portfolio/projects/", {
    revalidate: REVALIDATE.projects,
    tags: [CACHE_TAGS.projects],
    retry: true,
  });
}

export async function getProject(slug: string): Promise<ApiResult<Project>> {
  return apiGet<Project>(`/api/v1/public/portfolio/projects/${encodeURIComponent(slug)}/`, {
    revalidate: REVALIDATE.projects,
    tags: [CACHE_TAGS.projects],
  });
}

export async function getExperiences(): Promise<ApiResult<Experience[]>> {
  // Plural path - the singular /experience/ path does not exist. Meta
  // ordering ("-start_date", "display_order") = newest first already.
  return apiGetList<Experience>("/api/v1/public/portfolio/experiences/", {
    revalidate: REVALIDATE.experiences,
    tags: [CACHE_TAGS.experiences],
    retry: true,
  });
}

export async function getSkills(categoryId?: number): Promise<ApiResult<Skill[]>> {
  const query = categoryId ? `?category=${categoryId}` : "";
  return apiGetList<Skill>(`/api/v1/public/portfolio/skills/${query}`, {
    revalidate: REVALIDATE.skills,
    tags: [CACHE_TAGS.skills],
    retry: true,
  });
}

export async function getServices(): Promise<ApiResult<Service[]>> {
  return apiGetList<Service>("/api/v1/public/portfolio/services/", {
    revalidate: REVALIDATE.services,
    tags: [CACHE_TAGS.services],
    retry: true,
  });
}

export async function getEducation(): Promise<ApiResult<Education[]>> {
  return apiGetList<Education>("/api/v1/public/portfolio/education/", {
    revalidate: REVALIDATE.education,
    tags: [CACHE_TAGS.education],
    retry: true,
  });
}

/**
 * The backend exposes no /api/v1/public/portfolio/services/<slug>/
 * detail endpoint (confirmed in backend/apps/portfolio/api/urls.py,
 * which registers only "services/"). Only 7 rows exist, so the list is
 * fetched (one shared Next cache entry, same revalidate + tag as
 * getServices) and resolved locally. Adds zero backend surface.
 */
export async function getServiceBySlug(slug: string): Promise<ApiResult<Service>> {
  const result = await getServices();
  if (!result.ok) return result;
  const match = result.data.find((s) => s.slug === slug);
  return match
    ? { ok: true, data: match }
    : { ok: false, error: { kind: "not_found", status: 404, message: "Service not found." } };
}
