import type { Project, Service } from "@/lib/api/types";
import { absoluteUrl } from "@/lib/metadata";
import { OWNER_NAME, SITE_URL, SOCIAL_LINKS } from "@/content/site";
import type { ServiceFraming } from "@/content/services";

const PERSON_ID = `${SITE_URL}/#person`;

/** A stable @id, referenced everywhere else rather than redefining the
 * Person blob per page (a real improvement over the legacy app, which
 * repeats the same object on every route). Never Organization - this is
 * a single-person practice, and the addendum's brand direction forbids
 * it explicitly. */
export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: OWNER_NAME,
    url: SITE_URL,
    jobTitle: "Software Engineer",
    sameAs: [SOCIAL_LINKS.github, SOCIAL_LINKS.linkedin],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_URL,
    name: OWNER_NAME,
    publisher: { "@id": PERSON_ID },
  };
}

export function profilePageSchema(pathname: string, dateModified?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(pathname),
    mainEntity: { "@id": PERSON_ID },
    ...(dateModified ? { dateModified } : {}),
  };
}

/**
 * Criterion: it must be a live, publicly reachable web application a
 * person can actually use. The only mechanical, honest test available -
 * "if you can't click it, it isn't an application listing".
 */
export function qualifiesAsSoftwareApplication(project: Project): boolean {
  return project.live_url.trim().length > 0;
}

/**
 * WebApplication for a genuinely live project, CreativeWork otherwise
 * (e.g. Advanced Restaurant Management System, a desktop app with no
 * live URL by design). Deliberately never emits `offers` or
 * `aggregateRating` - neither exists, and Google's own rich-result
 * validator wanting them is not a reason to invent either one. These
 * entries exist for entity clarity, not to earn a rich snippet.
 */
export function projectSchema(project: Project) {
  const url = absoluteUrl(`/work/${project.slug}`);
  const base = {
    "@context": "https://schema.org",
    name: project.title,
    description: project.description,
    url,
    creator: { "@id": PERSON_ID },
  };

  if (qualifiesAsSoftwareApplication(project)) {
    return {
      ...base,
      "@type": "WebApplication",
      ...(project.technologies.length > 0
        ? { applicationCategory: project.technologies.map((t) => t.name).join(", ") }
        : {}),
    };
  }

  return { ...base, "@type": "CreativeWork" };
}

export function breadcrumbSchema(items: ReadonlyArray<{ name: string; pathname: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.pathname),
    })),
  };
}

/**
 * Returns null for a service without a SERVICE_FRAMING entry (owner
 * judgment call #6 - only 4 of 7 services have a defensible evidence
 * trail today). Never emits `offers` - no real pricing exists.
 */
export function serviceSchema(service: Service, framing: ServiceFraming | undefined) {
  if (!framing) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    provider: { "@id": PERSON_ID },
    url: absoluteUrl(`/services/${service.slug}`),
  };
}

/**
 * Escapes the whole serialized string, not just tag-looking substrings -
 * the correct mitigation for a </script> breakout inside an
 * application/ld+json block. See lib/json-ld.test.ts for a payload-based
 * regression test.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
