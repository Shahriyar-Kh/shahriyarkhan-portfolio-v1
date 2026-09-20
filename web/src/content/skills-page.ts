/**
 * /skills page framing only. Real skill/category records render from the
 * portfolio API. The synthesis below stays aligned with capabilities that
 * are evidenced by current projects and professional work; it never invents
 * years of experience, percentages, or certification-based mastery.
 */
export const SKILLS_INTRO = {
  eyebrow: "Skills",
  title: "Technical capability",
  lead: "Backend-first software engineering across Python/Django APIs, PostgreSQL, background processing, testing, and React/Next.js product delivery.",
} as const;

export interface WorkingRangeItem {
  title: string;
  body: string;
}

export const WORKING_RANGE: readonly WorkingRangeItem[] = [
  {
    title: "Backend & API engineering",
    body: "Python, Django, Django REST Framework, FastAPI, REST APIs, validation, and OpenAPI contracts for product-facing and operational workflows.",
  },
  {
    title: "Authentication & authorization",
    body: "JWT-based authentication, RBAC, ownership checks, and role-aware permission boundaries designed as part of the application architecture.",
  },
  {
    title: "Data & background systems",
    body: "PostgreSQL for relational application data, with Redis and Celery for caching, queues, scheduled work, and background processing where the product needs them.",
  },
  {
    title: "Full-stack product delivery",
    body: "React, Next.js, TypeScript, and JavaScript interfaces connected to real APIs, authentication flows, dashboards, and server-managed product data.",
  },
  {
    title: "Testing & delivery quality",
    body: "pytest, API verification, frontend tests, CI/CD, migration checks, lint/type gates, and Docker-based delivery practices across the projects that support them.",
  },
  {
    title: "Deployment & integrations",
    body: "Cloud-hosted deployment workflows plus third-party and AI-provider integrations, used when they solve a concrete product requirement rather than as standalone buzzwords.",
  },
] as const;
