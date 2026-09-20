/**
 * /experience framing only. Role/company/date facts render from the API.
 * Keep this file capability-oriented so employment changes cannot silently
 * drift into stale hardcoded biography.
 */
export const EXPERIENCE_INTRO = {
  eyebrow: "Experience",
  title: "Engineering work, grounded in evidence",
  lead: "Roles, companies, dates, achievements, and technologies below come from the same canonical records used by the portfolio API and résumé system.",
} as const;

export interface ProfessionalScopeItem {
  title: string;
  body: string;
}

export const PROFESSIONAL_SCOPE: readonly ProfessionalScopeItem[] = [
  {
    title: "Backend & API engineering",
    body: "Python, Django, Django REST Framework, FastAPI, REST APIs, validation, authentication, and permission boundaries.",
  },
  {
    title: "Data & background systems",
    body: "PostgreSQL, Redis, Celery, caching, background processing, exports, analytics, and maintainable data models.",
  },
  {
    title: "Full-stack product delivery",
    body: "React and Next.js interfaces connected to backend services, business workflows, and third-party integrations.",
  },
  {
    title: "Security & access control",
    body: "JWT authentication, RBAC, ownership checks, role-aware workflows, and clear authorization boundaries.",
  },
  {
    title: "Quality & delivery",
    body: "Automated testing, CI/CD, Docker, migration discipline, API contracts, and production-oriented deployment workflows.",
  },
  {
    title: "Team & product execution",
    body: "Turning requirements into maintainable implementation, communicating trade-offs, and taking ownership of assigned engineering work.",
  },
] as const;
