import type { CaseStudy } from "@/content/case-studies/types";

export const noteassistAi: CaseStudy = {
  slug: "noteassist-ai-productivity-platform",
  summary:
    "An AI-assisted learning and productivity platform for structured notes, saved outputs, quotas, exports, Google integrations, administration, and background processing.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement:
            "The platform uses Django REST Framework and React with PostgreSQL, Redis, Celery, JWT-based access, and background processing.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/noteassist_ai README and repository evidence reviewed 2026-09-21.",
        },
        {
          id: "ai-provider",
          statement:
            "AI-assisted generation and summarization workflows are implemented through provider integration, with Groq represented in the current engineering stack.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/noteassist_ai README and canonical project manifest reviewed 2026-09-21.",
        },
        {
          id: "google",
          statement:
            "The product includes Google OAuth/Drive integration, plan and quota controls, exports, dashboards, and administrative workflows.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/noteassist_ai README and implementation evidence reviewed 2026-09-21.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "noteassistai.vercel.app",
      href: "https://noteassistai.vercel.app",
      verifiedOn: "2026-09-21",
    },
    {
      kind: "repo",
      label: "GitHub repository",
      href: "https://github.com/Shahriyar-Kh/noteassist_ai",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "usage-scale",
      statement: "The product operates at a specific user or request scale.",
      status: "prohibited",
      evidence: "No independently verified public usage or load benchmark supports a scale claim.",
    },
    {
      id: "high-availability",
      statement: "The product provides high availability.",
      status: "prohibited",
      evidence: "No availability SLO or external uptime evidence supports this claim.",
    },
  ],
  limitations: [
    "No user-count, availability, performance, or adoption metric is published without measured evidence.",
    "The repository is public; project claims remain limited to behavior and stack supported by the current code and README.",
  ],
  lastReviewed: "2026-09-21",
};
