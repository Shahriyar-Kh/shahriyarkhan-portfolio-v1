import type { CaseStudy } from "@/content/case-studies/types";

export const noteassistAi: CaseStudy = {
  slug: "noteassist-ai-productivity-platform",
  summary: "A note-taking and productivity API with JWT authentication, role-based access, and Redis caching.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement:
            "The API is built with Django REST Framework, uses JSON Web Tokens with role-based access control, and Redis as a caching layer.",
          status: "verified",
          evidence: "Live API technologies field (Django, DRF, PostgreSQL, React.js, Redis, JWT).",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "noteassistai.vercel.app",
      href: "https://noteassistai.vercel.app",
      verifiedOn: "2026-08-27",
    },
  ],
  withheld: [
    {
      id: "production-grade-users",
      statement: "A production-grade productivity tool... live and accessible for real users.",
      status: "prohibited",
      evidence: "docs/rebuild/CONTENT_TRUTH_INVENTORY.md - no user, load, or usage evidence exists.",
    },
    {
      id: "enterprise-isolation",
      statement: "Enterprise-grade data isolation.",
      status: "prohibited",
      evidence: "No isolation testing or audit exists to support this superlative.",
    },
    {
      id: "role",
      statement: "Solo-built, or built as part of a team.",
      status: "pending",
      evidence: "[owner to confirm] - OPEN_DECISIONS.md #12.",
    },
    {
      id: "screenshot-currency",
      statement: "Current screenshots match the live app exactly.",
      status: "pending",
      evidence: "OPEN_DECISIONS.md #14 - screenshot timestamps are from April 2026.",
    },
  ],
  limitations: [
    "No usage, performance, or adoption figures are published for this project, because none have been measured.",
    "Source code for this project is not published publicly; the GitHub link on this project is a profile link, not a repository link.",
  ],
  lastReviewed: "2026-08-31",
};
