import type { CaseStudy } from "@/content/case-studies/types";

export const techBuiltOpenSchoolFyp: CaseStudy = {
  slug: "techbuilt-open-school-lms-final-year-project",
  summary:
    "The first-generation TechBuilt Open School Learning Management System, built as a Final Year Project and kept distinct from the current organizational rebuild.",
  sections: [
    {
      key: "context",
      heading: "Academic project generation",
      claims: [
        {
          id: "legacy",
          statement:
            "This repository represents the legacy/academic LMS generation and must not be confused with the separate 2026 next-generation TechBuilt Open School platform.",
          status: "verified",
          evidence: "Owner-approved canonical project distinction, 2026-09-21.",
        },
      ],
    },
    {
      key: "architecture",
      heading: "LMS scope",
      claims: [
        {
          id: "domains",
          statement:
            "The legacy codebase contains modular domains for accounts, courses, lessons, videos, quizzes, assignments, enrollments, payments, reviews, analytics, AI tools, certificates, and notifications.",
          status: "verified",
          evidence: "github.com/Shahriyar-Kh/TBOS README and repository structure reviewed 2026-09-21.",
        },
        {
          id: "stack",
          statement:
            "The verified repository stack includes Python, Django, DRF, Next.js/React, PostgreSQL, Redis/Celery, JWT, OpenAPI, and testing tooling.",
          status: "verified",
          evidence: "github.com/Shahriyar-Kh/TBOS README reviewed 2026-09-21.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "repo",
      label: "Legacy/FYP repository",
      href: "https://github.com/Shahriyar-Kh/TBOS",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "github-date-as-fyp-date",
      statement: "The 2026 GitHub upload/commit dates are the original academic project dates.",
      status: "prohibited",
      evidence: "The repository was uploaded/reworked later; Git history is not evidence of original academic dates.",
    },
  ],
  limitations: [
    "The portfolio does not infer exact academic FYP months from later GitHub upload history.",
    "This legacy LMS is intentionally separated from the current Phase 1 organizational platform.",
  ],
  lastReviewed: "2026-09-21",
};
