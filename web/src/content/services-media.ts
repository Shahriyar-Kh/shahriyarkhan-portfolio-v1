/**
 * Presentation-only media and short client-facing context for the six
 * canonical services. Images are custom-crafted illustrative architecture
 * and interface assets designed specifically for each service domain;
 * they are never presented as proof of a client engagement.
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
      alt: "Custom business workflow and enterprise operations interface",
      kind: "illustrative",
    },
    bestFor: "Businesses that need software shaped around their real workflow, roles, data, and integrations.",
    scope:
      "Backend/API architecture, permissions, operational dashboards, integrations, testing, and deployment preparation are scoped around the actual business process.",
    techTags: ["Python", "Django/DRF", "PostgreSQL", "React.js"],
  },
  "web-development": {
    image: {
      file: "/images/services/website-development.webp",
      alt: "Modern web product interface with analytics and intelligence workflows",
      kind: "illustrative",
    },
    bestFor: "Teams that need a responsive public or authenticated web product connected to real application data.",
    scope:
      "Responsive interfaces, backend/API integration, accessibility fundamentals, SEO-aware delivery, and deployment support where the product requires them.",
    techTags: ["React.js", "Next.js", "Django/DRF"],
  },
  "application-development": {
    image: {
      file: "/images/services/application-development.webp",
      alt: "Application workspace dashboard with task distribution and role-based access controls",
      kind: "illustrative",
    },
    bestFor: "Products with accounts, multi-step workflows, dashboards, administration, and role-aware application behavior.",
    scope:
      "Application delivery spans data models, REST APIs, authentication, frontend workflows, administration, integrations, and verification of failure cases.",
    techTags: ["Python", "Django/DRF", "React.js", "PostgreSQL"],
  },
  "saas-development": {
    image: {
      file: "/images/services/saas-project.webp",
      alt: "Multi-tenant SaaS dashboard with subscription plans and API usage quotas",
      kind: "illustrative",
    },
    bestFor: "Founders and teams building authenticated multi-user products with dashboards and recurring product workflows.",
    scope:
      "Accounts, roles, quotas or entitlements, dashboards, background work, integrations, and administration are designed as maintainable product concerns.",
    techTags: ["Django/DRF", "PostgreSQL", "Redis", "React.js"],
  },
  "database-development": {
    image: {
      file: "/images/services/backend-development.webp",
      alt: "Relational database schema architecture and query performance monitoring",
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
      alt: "Kubernetes cluster topology and CI/CD deployment pipelines dashboard",
      kind: "illustrative",
    },
    bestFor: "Teams that need an application prepared for repeatable cloud deployment rather than a local-only handoff.",
    scope:
      "Environment-aware configuration, database/cache/worker boundaries, health checks, CI/CD, deployment workflows, and handover are treated as part of delivery.",
    techTags: ["Docker", "CI/CD", "Cloudflare Workers", "Railway"],
  },
} as const;
