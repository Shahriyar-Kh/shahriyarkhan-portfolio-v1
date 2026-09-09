/**
 * FINAL-DESIGN-01E-01: /skills' own page copy. Real skill/category
 * records always render live from the Skill API - nothing here
 * restates or overrides a name, category, or level. This file is page
 * framing and the "working range" synthesis only, and every working-
 * range item is traceable to real category coverage or a real project
 * technology field (see the doc comment on WORKING_RANGE below) - never
 * a years-of-experience, certification, or mastery claim.
 */
export const SKILLS_INTRO = {
  eyebrow: "Skills",
  title: "Technical capability",
  lead: "Backend engineering in Python and Django, REST APIs, and full-stack applications with a database, a frontend, and a deployment target behind them.",
} as const;

export interface WorkingRangeItem {
  title: string;
  body: string;
}

/**
 * Each item is grounded in one of two real sources, never an
 * unsupported claim:
 * - a real skill the backend returns (e.g. the real, published
 *   "JWT / RBAC" and "REST APIs" Backend-category skill entries), or
 * - a real, published Project's own `technologies` field (JWT appears
 *   on 3 of 6 real projects' technology lists, corroborating the real
 *   "JWT / RBAC" skill entry, and the same fact is independently
 *   corroborated by the verified claim register - see
 *   content/case-studies/*.ts).
 * "Testing" is deliberately scoped to what Postman (a real, published
 * Tools-category skill) actually supports - request-level API testing
 * and verification - not a broader, unsupported testing claim (no
 * automated-test-suite tooling exists in the real skill data).
 */
export const WORKING_RANGE: readonly WorkingRangeItem[] = [
  {
    title: "Backend & API engineering",
    body: "Django, DRF, and FastAPI - designing the data model and the REST API surface a frontend actually consumes.",
  },
  {
    title: "Authentication & permissions",
    body: "JWT-based authentication and role-based access - a real, published skill entry, corroborated by the project technology record for three published projects.",
  },
  {
    title: "Data & database design",
    body: "PostgreSQL, MySQL, and Redis for structured and cached data, MongoDB where a document shape genuinely fits better.",
  },
  {
    title: "Frontend integration",
    body: "React and JavaScript on top of HTML5/CSS3, styled with Tailwind CSS or Bootstrap, wired to whatever API the project needs - not a standalone frontend practice.",
  },
  {
    title: "API testing & verification",
    body: "Postman for request-level testing and verification of the APIs being built.",
  },
  {
    title: "Deployment",
    body: "Docker, Cloudflare Workers, Vercel, and Render to get a system from a local build to a real, running URL.",
  },
] as const;
