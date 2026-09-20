/**
 * Recruiter-first homepage copy aligned with the canonical GitHub +
 * LinkedIn profile. No level inflation, fabricated metrics, or scale claims.
 */

export const HERO_ROLES: readonly string[] = [
  "Software Engineer",
  "Backend Engineer",
  "Python & Django Developer",
];

export const HERO_COPY = {
  eyebrow: "Pakistan · Remote internationally",
  title: "Shahriyar Khan",
  lead: "Python/Django backend engineering for REST APIs, authenticated products, and backend-heavy full-stack systems.",
  primaryCta: { label: "View engineering work", href: "/work" },
  secondaryCta: { label: "Discuss a project", href: "/contact?intent=freelance_project" },
} as const;

export const ENGINEERING_APPROACH_COPY = {
  title: "How I move from requirements to a working system",
  subtitle: "Discovery, architecture, implementation, testing, deployment, and handover — with the evidence kept traceable.",
} as const;

export const CLIENT_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What do you build?",
    answer:
      "Backend-heavy web applications, REST APIs, SaaS/EdTech products, and custom business systems using Python, Django/DRF, FastAPI, PostgreSQL, and React/Next.js.",
  },
  {
    question: "Do you work with existing systems or only new builds?",
    answer:
      "Both. I start by understanding the data model, access rules, existing workflows, integration boundaries, and the change the product actually needs.",
  },
  {
    question: "Can you work across backend and frontend?",
    answer:
      "Yes. Backend engineering is my strongest area, and I also deliver complete products with React/Next.js when the project needs full-stack ownership.",
  },
  {
    question: "How do we start?",
    answer:
      "Send a short description of the role or product through the contact page. For project work, include the problem, users, and the main workflow you need to support.",
  },
];

export const DUAL_CTA_COPY = {
  hiring: {
    title: "Hiring for a software engineering role",
    body: "Review evidence-backed backend/full-stack work, verified experience, and the systems behind the résumé.",
    cta: { label: "View résumé", href: "/resume" },
  },
  project: {
    title: "Building a software product",
    body: "Discuss backend/API work, a custom web application, SaaS/EdTech delivery, or a full-stack product build.",
    cta: { label: "Start a conversation", href: "/contact?intent=freelance_project" },
  },
} as const;
