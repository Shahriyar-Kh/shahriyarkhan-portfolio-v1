/**
 * Presentation-only media and short client-facing context for the six
 * canonical services. Images reuse already-reviewed owned project captures
 * or an existing illustrative engineering image; they are never presented
 * as proof of a client engagement unless the related project itself provides
 * that evidence.
 */
export interface ServiceImage {
  file: string;
  alt: string;
  kind: "owned" | "illustrative";
  width?: number;
  height?: number;
}

export interface ServiceMediaEntry {
  image: ServiceImage;
  bestFor: string;
  scope: string;
  techTags: readonly string[];
}

export const SERVICES_MEDIA: Readonly<Record<string, ServiceMediaEntry>> = {
  "custom-software-development": {
    image: {
      file: "/images/services/custom-web-application.webp",
      alt: "Yango Wing Fleet, an example of a custom business workflow application",
      kind: "owned",
      width: 1280,
      height: 3420,
    },
    bestFor: "Businesses that need software shaped around their real workflow, roles, data, and integrations.",
    scope:
      "Backend/API architecture, permissions, operational dashboards, integrations, testing, and deployment preparation are scoped around the actual business process.",
    techTags: ["Python", "Django/DRF", "PostgreSQL", "React.js"],
  },
  "web-development": {
    image: {
      file: "/images/services/website-development.webp",
      alt: "SK LearnTrack, an example of a responsive web product",
      kind: "owned",
      width: 1280,
      height: 3553,
    },
    bestFor: "Teams that need a responsive public or authenticated web product connected to real application data.",
    scope:
      "Responsive interfaces, backend/API integration, accessibility fundamentals, SEO-aware delivery, and deployment support where the product requires them.",
    techTags: ["React.js", "Next.js", "Django/DRF"],
  },
  "application-development": {
    image: {
      file: "/images/services/custom-web-application.webp",
      alt: "A full-stack business application workflow from the Yango Wing Fleet project",
      kind: "owned",
      width: 1280,
      height: 3420,
    },
    bestFor: "Products with accounts, multi-step workflows, dashboards, administration, and role-aware application behavior.",
    scope:
      "Application delivery spans data models, REST APIs, authentication, frontend workflows, administration, integrations, and verification of failure cases.",
    techTags: ["Python", "Django/DRF", "React.js", "PostgreSQL"],
  },
  "saas-development": {
    image: {
      file: "/images/services/saas-project.webp",
      alt: "NoteAssist AI, an example of an authenticated multi-user product",
      kind: "owned",
      width: 1280,
      height: 4833,
    },
    bestFor: "Founders and teams building authenticated multi-user products with dashboards and recurring product workflows.",
    scope:
      "Accounts, roles, quotas or entitlements, dashboards, background work, integrations, and administration are designed as maintainable product concerns.",
    techTags: ["Django/DRF", "PostgreSQL", "Redis", "React.js"],
  },
  "database-development": {
    image: {
      file: "/images/services/backend-development.webp",
      alt: "Backend engineering code representing database-backed application development",
      kind: "illustrative",
    },
    bestFor: "Applications that need a clear relational model, migrations, filtering, reporting, and reliable data-backed operations.",
    scope:
      "Schema design starts from domain relationships and access rules, then supports API queries, reporting, exports, migrations, and background workflows.",
    techTags: ["PostgreSQL", "Django/DRF", "Redis", "Python"],
  },
  "cloud-application-development": {
    image: {
      file: "/images/services/portfolio-website.webp",
      alt: "Shahriyar Khan's deployed full-stack portfolio platform",
      kind: "owned",
      width: 1280,
      height: 5300,
    },
    bestFor: "Teams that need an application prepared for repeatable cloud deployment rather than a local-only handoff.",
    scope:
      "Environment-aware configuration, database/cache/worker boundaries, health checks, CI/CD, deployment workflows, and handover are treated as part of delivery.",
    techTags: ["Docker", "CI/CD", "Cloudflare Workers", "Railway"],
  },
} as const;
