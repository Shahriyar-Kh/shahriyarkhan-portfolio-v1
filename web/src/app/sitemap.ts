import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { getProjects, getServices } from "@/lib/api";

const STATIC_ROUTES = ["/", "/about", "/skills", "/work", "/experience", "/resume", "/services", "/contact", "/privacy"];

/**
 * lastModified always comes from a real updated_at field when one is
 * available - never `new Date()` per request, which would make every
 * entry look freshly changed on every crawl regardless of reality.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, services] = await Promise.all([getProjects(), getServices()]);

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((pathname) => ({
    url: `${SITE_URL}${pathname === "/" ? "" : pathname}` || SITE_URL,
    changeFrequency: "monthly",
  }));

  if (projects.ok) {
    for (const project of projects.data) {
      entries.push({
        url: `${SITE_URL}/work/${project.slug}`,
        lastModified: project.updated_at,
        changeFrequency: "monthly",
      });
    }
  }

  if (services.ok) {
    for (const service of services.data) {
      entries.push({
        url: `${SITE_URL}/services/${service.slug}`,
        lastModified: service.updated_at,
        changeFrequency: "monthly",
      });
    }
  }

  return entries;
}
