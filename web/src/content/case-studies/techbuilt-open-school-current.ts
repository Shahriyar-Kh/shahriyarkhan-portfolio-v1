import type { CaseStudy } from "@/content/case-studies/types";

export const techBuiltOpenSchoolCurrent: CaseStudy = {
  slug: "techbuilt-open-school-multilingual-education-platform-operational-lms",
  summary:
    "A next-generation multilingual education-platform and operational-LMS foundation in Phase 1 active development, using an API-first modular monolith and checked contracts.",
  sections: [
    {
      key: "status",
      heading: "Current status",
      claims: [
        {
          id: "phase-one",
          statement:
            "The current TechBuilt Open School platform is in Phase 1 active development; the public repository is an engineering showcase rather than the canonical source.",
          status: "verified",
          evidence: "github.com/Shahriyar-Kh/TechBuilt_OS README reviewed 2026-09-21.",
        },
      ],
    },
    {
      key: "architecture",
      heading: "Engineering foundation",
      claims: [
        {
          id: "stack",
          statement:
            "The current foundation uses Python 3.13, Django 5.2 LTS, DRF, Next.js 16, React 19, TypeScript, PostgreSQL, Redis, Celery, OpenAPI, and CI/security tooling.",
          status: "verified",
          evidence: "github.com/Shahriyar-Kh/TechBuilt_OS README reviewed 2026-09-21.",
        },
        {
          id: "modular-monolith",
          statement:
            "The architecture is an API-first modular monolith with separate web/API deployables, checked OpenAPI contracts, structured logging, and health endpoints.",
          status: "verified",
          evidence: "github.com/Shahriyar-Kh/TechBuilt_OS README reviewed 2026-09-21.",
        },
        {
          id: "multilingual",
          statement:
            "The code-level locale direction includes English, Urdu, Hindi, and Pashto, with English and Urdu approved for the initial publication direction and RTL foundations for Urdu/Pashto.",
          status: "verified",
          evidence: "github.com/Shahriyar-Kh/TechBuilt_OS README reviewed 2026-09-21.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "repo",
      label: "Public engineering showcase",
      href: "https://github.com/Shahriyar-Kh/TechBuilt_OS",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "private-canonical",
      statement: "The private canonical source repository URL or internal operational materials.",
      status: "prohibited",
      evidence: "The public showcase intentionally preserves a private-source boundary.",
    },
    {
      id: "production-launch",
      statement: "The next-generation platform is already in production.",
      status: "prohibited",
      evidence: "Current public status is Phase 1 active development; production launch is not claimed.",
    },
    {
      id: "future-domains",
      statement: "All planned admissions, payments, LMS, and operational domains are already implemented.",
      status: "prohibited",
      evidence: "Requirements, draft work, merged implementation, and production behavior are intentionally distinguished.",
    },
  ],
  limitations: [
    "The public showcase is not the canonical private source repository.",
    "Phase 1 active development is not presented as a completed or production-launched LMS.",
  ],
  lastReviewed: "2026-09-21",
};
