/**
 * FINAL-DESIGN-01F-01: /experience's own page framing and the
 * Professional Scope synthesis. Real Experience/Education records
 * always render live from the API - nothing here restates or overrides
 * a role, company, date, or achievement. This file is page copy and a
 * capability-area synthesis only, and every synthesized item is
 * traceable to a real Experience record's technologies or achievements
 * (cited inline below) - never an invented claim, duration, or metric.
 */
export const EXPERIENCE_INTRO = {
  eyebrow: "Experience",
  title: "The structured record",
  lead: "Every role, company, and date below is pulled live from the same record the résumé draws from - the recruiter-scannable version of the story About tells.",
} as const;

export interface ProfessionalScopeItem {
  title: string;
  body: string;
}

/**
 * Each item is grounded in a real Experience record's own `technologies`
 * or `achievements` field (both live-fetched, quoted/paraphrased here
 * only for the citation comment - never restated as page copy that could
 * drift out of sync with the source):
 * - Backend & API: Django/DRF/FastAPI/REST APIs appear on all 3 real
 *   roles' technology lists.
 * - Authentication & authorization: role #1's (HA Technologies) real
 *   achievement "Designed secure backend architectures with JWT
 *   authentication and RBAC."
 * - Data & database engineering: PostgreSQL/MongoDB/Redis/SQLite appear
 *   across the 3 real roles' technology lists.
 * - Frontend integration: React.js/React appear on 2 of 3 real roles'
 *   technology lists.
 * - Deployment: role #1's real achievement "Deployed applications using
 *   Render and Vercel in agile environments."
 * - Team leadership: role #3's real title, "Web Developer Intern (Team
 *   Lead)," and its real achievement "Led development team and managed
 *   task execution."
 * Deliberately excludes "testing" (listed as an example capability area
 * in the brief) - no real Experience technology or achievement mentions
 * it, unlike the Skills page's Postman-backed testing claim.
 */
export const PROFESSIONAL_SCOPE: readonly ProfessionalScopeItem[] = [
  {
    title: "Backend & API development",
    body: "Django, DRF, and FastAPI - the technology stack on every real role in this record.",
  },
  {
    title: "Authentication & authorization",
    body: "JWT-based authentication and role-based access control, designed into production backend architecture.",
  },
  {
    title: "Data & database engineering",
    body: "PostgreSQL, MongoDB, Redis, and SQLite, chosen per project rather than a single default.",
  },
  {
    title: "Frontend integration",
    body: "React wired to the APIs above, not practiced as a standalone frontend discipline.",
  },
  {
    title: "Deployment",
    body: "Shipping applications to Render and Vercel as part of the day-to-day role, not a separate handoff.",
  },
  {
    title: "Team leadership",
    body: "Led a development team's task execution as Team Lead on a real, published role.",
  },
] as const;
