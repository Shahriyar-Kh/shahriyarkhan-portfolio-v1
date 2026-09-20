/**
 * /about narrative. Employment and education records render from the API;
 * this file holds durable professional positioning, engineering approach,
 * and capability framing only.
 */

export const ABOUT_INTRO = {
  eyebrow: "About",
  title: "Backend engineering with full-product context",
  lead: "I’m a Software Engineer specializing in Python/Django backend engineering and backend-heavy full-stack product development.",
} as const;

export const ABOUT_SPECIALIZATION_FALLBACK =
  "Software Engineer focused on Python, Django, Django REST Framework, FastAPI, PostgreSQL, Redis/Celery, and complete React/Next.js product delivery.";

export const ABOUT_CAREER_STORY: readonly string[] = [
  "My strongest area is backend engineering: data modeling, API architecture, authentication and authorization, JWT/RBAC, validation, background processing, caching, testing, and clear service boundaries.",
  "I build REST APIs, authenticated business platforms, SaaS and EdTech systems, internal tools, and AI-integrated web applications — then connect them to React or Next.js when the product needs full-stack delivery.",
  "Recent contract work through TriCore Digital Tech includes a private NCLEX learning platform spanning requirements, Django/DRF architecture, Next.js workflows, analytics, subscriptions, testing, security hardening, and deployment preparation.",
  "Across projects, I focus on how a system behaves beyond the happy path: permission boundaries, failure cases, maintainable business logic, database evolution, testability, security, and API contracts that remain understandable as the product changes.",
];

export const ABOUT_PRINCIPLES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Model the domain before the endpoint",
    body: "Data relationships, ownership, and access boundaries shape the API. Getting those right early keeps later business logic easier to reason about.",
  },
  {
    title: "Authorization is architecture",
    body: "Authentication answers who the user is; authorization decides what they may do. I design those rules as part of the system, not as a final patch.",
  },
  {
    title: "Make engineering claims traceable",
    body: "Projects on this site link to live products, public repositories, or sanitized evidence. I avoid inventing scale, performance, or outcome claims.",
  },
];

export const ABOUT_PREVIEW_CTA = { label: "See the engineering work", href: "/work" } as const;
export const ABOUT_RECORD_PREVIEW_CTA = { label: "View experience and education", href: "/experience" } as const;
export const ABOUT_STRENGTHS_CTA = { label: "Explore the skills evidence", href: "/skills" } as const;

export const ABOUT_LANGUAGES: readonly string[] = [
  "Pashto (Native)",
  "Urdu (Native)",
  "English (Professional)",
];

export const ABOUT_HERO_META = {
  location: "Pakistan",
  availability: "Open to roles & selected projects",
} as const;

export const ABOUT_HERO_EYEBROW = "About";

export const ABOUT_ARCHITECTURE_COPY = {
  eyebrow: "Architecture",
  title: "The layers I work across",
  lead: "Backend engineering is the center of gravity, with frontend, data, background processing, and deployment treated as connected parts of the same product.",
} as const;

export interface AboutArchitectureLayer {
  category: "Frontend" | "Backend" | "Database" | "Deployment";
  title: string;
  body: string;
}

export const ABOUT_ARCHITECTURE_LAYERS: readonly AboutArchitectureLayer[] = [
  {
    category: "Frontend",
    title: "Product interface",
    body: "React and Next.js interfaces connected to real APIs, authentication, product workflows, and server-managed data.",
  },
  {
    category: "Backend",
    title: "API and application rules",
    body: "Python, Django/DRF, and FastAPI for versioned APIs, validation, permissions, domain rules, integrations, and operational tooling.",
  },
  {
    category: "Database",
    title: "Data and background systems",
    body: "PostgreSQL as the primary relational store, with Redis/Celery for caching, queues, scheduled work, and background processing where needed.",
  },
  {
    category: "Deployment",
    title: "Delivery and quality",
    body: "Docker, CI/CD, testing, OpenAPI contracts, migrations, and cloud deployment workflows that keep application behavior reviewable.",
  },
];

export const ABOUT_STRENGTHS_COPY = {
  eyebrow: "Coverage",
  title: "Core engineering strengths",
  lead: "The strongest skills are tied to real project evidence rather than presented as arbitrary percentages.",
} as const;

export const ABOUT_STRENGTHS_CAPTIONS: Readonly<Record<string, string>> = {
  Backend: "Python, Django/DRF, FastAPI, REST APIs, authentication, permissions, and application architecture.",
  Database: "PostgreSQL, Redis, MongoDB, relational modeling, caching, and data-backed operational workflows.",
  Frontend: "React, Next.js, TypeScript, and interfaces connected to real backend services.",
  Tools: "Git/GitHub, Docker, Postman, pytest, OpenAPI, and the everyday tooling used to verify delivery.",
  Deployment: "CI/CD and cloud deployment workflows across the environments used by the projects on this site.",
} as const;

export const ABOUT_TIMELINE_COPY = {
  eyebrow: "Career",
  title: "Where this experience comes from",
  lead: "Employment and internship records below come from the same structured source used by the résumé and Experience page.",
} as const;

export const ABOUT_EDUCATION_COPY = {
  eyebrow: "Education",
} as const;
