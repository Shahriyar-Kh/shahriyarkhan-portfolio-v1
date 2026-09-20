export interface RouteMetadataDefault {
  /** The PageSEO page_key this route checks for enhancement data. A
   * missing/unseeded key is expected and falls back to this default
   * silently - see lib/api/seo.ts. */
  pageKey: string;
  title: string;
  description: string;
  keywords?: string;
}

/**
 * Canonical metadata defaults: concise, evidence-backed and recruiter-first.
 * Titles stay <=60 chars and descriptions stay 120-160 chars (test-enforced).
 */
export const ROUTE_METADATA_DEFAULTS: Record<string, RouteMetadataDefault> = {
  home: {
    pageKey: "home",
    title: "Shahriyar Khan | Software Engineer & Django Backend",
    description:
      "Software Engineer specializing in Python/Django backend engineering, REST APIs, PostgreSQL, and backend-heavy full-stack products with React/Next.js.",
    keywords:
      "Shahriyar Khan software engineer, backend engineer, Python developer, Django developer, Django REST Framework, REST API developer, PostgreSQL",
  },
  about: {
    pageKey: "about",
    title: "About Shahriyar Khan | Python/Django Backend Engineer",
    description:
      "Software Engineer focused on Python/Django backend systems, API architecture, authentication, PostgreSQL, testing, and React/Next.js product delivery.",
    keywords:
      "Shahriyar Khan about, Python Django backend engineer, backend developer Pakistan, full-stack software engineer",
  },
  skills: {
    pageKey: "skills",
    title: "Skills | Shahriyar Khan — Python & Backend Engineering",
    description:
      "Evidence-backed skills across Python, Django/DRF, FastAPI, PostgreSQL, Redis/Celery, React/Next.js, testing, CI/CD, Docker, and API engineering.",
    keywords:
      "Python, Django, Django REST Framework, FastAPI, PostgreSQL, Redis, Celery, React, Next.js, Docker, CI/CD",
  },
  work: {
    pageKey: "work",
    title: "Projects | Shahriyar Khan — Software Engineering Portfolio",
    description:
      "Case studies across Django/DRF, FastAPI, PostgreSQL, Redis/Celery, React/Next.js, testing, CI/CD, operational workflows, and practical AI integrations.",
    keywords:
      "Django projects, backend engineering portfolio, REST API projects, Python software engineer projects, full-stack case studies",
  },
  experience: {
    pageKey: "experience",
    title: "Experience | Shahriyar Khan — Software Engineer",
    description:
      "Professional experience in backend and full-stack engineering across Python/Django APIs, authenticated products, client systems, and team delivery.",
    keywords:
      "Shahriyar Khan experience, software engineer experience, Python Django developer experience, backend engineer Pakistan",
  },
  resume: {
    pageKey: "resume",
    title: "Resume | Shahriyar Khan — Software Engineer",
    description:
      "Software Engineer resume covering Python/Django backend engineering, REST APIs, PostgreSQL, React/Next.js, testing, CI/CD, and verified project experience.",
    keywords:
      "Shahriyar Khan resume, software engineer CV, Python developer resume, Django developer resume, backend engineer resume",
  },
  services: {
    pageKey: "services",
    title: "Services | Python/Django & Full-Stack Development",
    description:
      "Backend-heavy web applications, REST APIs, SaaS/EdTech platforms, and custom business systems using Python/Django, PostgreSQL, and React/Next.js.",
    keywords:
      "custom software development, Django development, REST API development, SaaS development, web application development",
  },
  contact: {
    pageKey: "contact",
    title: "Contact Shahriyar Khan | Software Engineer",
    description:
      "Open to international remote software engineering roles, Pakistan-based opportunities, contract engineering, and selected software product collaborations.",
    keywords:
      "contact Shahriyar Khan, remote software engineer, Django developer Pakistan, backend engineer contract",
  },
  privacy: {
    pageKey: "privacy",
    title: "Privacy | Shahriyar Khan Portfolio",
    description:
      "How this portfolio handles contact and project-request data, spam prevention, analytics boundaries, data retention, and privacy across public-facing workflows.",
  },
};
