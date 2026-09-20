import type { CaseStudy } from "@/content/case-studies/types";

export const nursesBeyondBorders: CaseStudy = {
  slug: "nurses-beyond-borders-nclex-learning-exam-preparation-platform",
  summary:
    "A private-client NCLEX learning and assessment platform covering NGN-style workflows, learning progress, analytics, subscriptions/entitlements, testing, and deployment preparation.",
  sections: [
    {
      key: "context",
      heading: "Client context",
      claims: [
        {
          id: "tricore",
          statement:
            "This project is a private client engagement delivered through TriCore Digital Tech and is presented here only through a sanitized engineering case study.",
          status: "verified",
          evidence: "Owner-approved canonical public profile specification, 2026-09-21.",
        },
      ],
    },
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement:
            "The platform uses Django/DRF, Next.js/React, PostgreSQL, Redis, Celery, JWT authentication, and Docker in a modular-monolith architecture.",
          status: "verified",
          evidence:
            "Public-safe case study: github.com/Shahriyar-Kh/Shahriyar-Kh/blob/main/case-studies/nbb-lms.md",
        },
        {
          id: "assessment",
          statement:
            "Assessment workflows include single-choice, SATA, matrix/NGN-style interactions, case-study grouping, timed attempts, autosave, deterministic scoring, frozen attempt snapshots, and post-attempt review.",
          status: "verified",
          evidence:
            "Public-safe case study: github.com/Shahriyar-Kh/Shahriyar-Kh/blob/main/case-studies/nbb-lms.md",
        },
        {
          id: "learning",
          statement:
            "Learning workflows include course/module/lesson progress, entitlement checks, study planning, recommendations, notifications, analytics, and weak-area signals.",
          status: "verified",
          evidence:
            "Public-safe case study: github.com/Shahriyar-Kh/Shahriyar-Kh/blob/main/case-studies/nbb-lms.md",
        },
      ],
    },
    {
      key: "outcome",
      heading: "Quality evidence",
      claims: [
        {
          id: "backend-tests",
          statement:
            "Recorded repository evidence includes 1,069 passing backend tests with an enforced 80% backend coverage floor.",
          status: "verified",
          evidence:
            "Public-safe case study and private engineering documentation summarized in the canonical specification, reviewed 2026-09-21.",
        },
        {
          id: "frontend-tests",
          statement:
            "Frontend engineering documentation records 700+ unit tests across roughly 150 files, alongside TypeScript, lint, build, and Storybook quality gates.",
          status: "verified",
          evidence:
            "Public-safe case study and canonical public-content specification, reviewed 2026-09-21.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "repo",
      label: "Public engineering case study",
      href: "https://github.com/Shahriyar-Kh/Shahriyar-Kh/blob/main/case-studies/nbb-lms.md",
      verifiedOn: "2026-09-21",
    },
    {
      kind: "live",
      label: "Public frontend preview",
      href: "https://nbb-lms.vercel.app/",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "private-source",
      statement: "The private client repository, internal requirements, credentials, learner data, or infrastructure access details.",
      status: "prohibited",
      evidence: "Client confidentiality boundary.",
    },
    {
      id: "question-count",
      statement: "The current platform contains 1,500+ questions.",
      status: "prohibited",
      evidence: "The 1,500+ figure was a long-term product target, not a verified current-bank count.",
    },
    {
      id: "production-cutover",
      statement: "The final custom-domain/VPS production cutover is already live.",
      status: "prohibited",
      evidence: "Public case study explicitly says final production cutover is pending.",
    },
    {
      id: "live-billing",
      statement: "Stripe production billing is live.",
      status: "prohibited",
      evidence: "Stripe is represented as an integration/testing boundary, not live production billing.",
    },
  ],
  limitations: [
    "Only sanitized engineering evidence is published; the client source repository remains private.",
    "The public preview is not presented as proof that final VPS/custom-domain cutover is complete.",
    "Stripe is described as an integration/testing boundary rather than live production billing.",
  ],
  lastReviewed: "2026-09-21",
  projectContext: "client",
};
