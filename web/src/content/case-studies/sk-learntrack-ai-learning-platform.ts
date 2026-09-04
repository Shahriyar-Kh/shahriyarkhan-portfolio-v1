import type { CaseStudy } from "@/content/case-studies/types";

export const skLearntrack: CaseStudy = {
  slug: "sk-learntrack-ai-learning-platform",
  summary: "A learning platform combining structured course progression with an OpenAI-powered study assistant.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement: "Built with Django REST Framework and React, with course progression and student progress tracking as first-class features.",
          status: "verified",
          evidence: "Live API technologies field (Django, DRF, React, PostgreSQL, OpenAI).",
        },
        {
          id: "openai",
          statement: "An OpenAI integration provides in-app study assistance.",
          status: "inferred",
          evidence: "OpenAI listed in the live API's technologies field; integration behavior not independently re-tested.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "sk-learntrack.vercel.app",
      href: "https://sk-learntrack.vercel.app",
      verifiedOn: "2026-08-27",
    },
  ],
  withheld: [
    {
      id: "sixty-percent-metric",
      statement: "AI assistance reduces time-to-answer by over 60% compared to traditional search.",
      status: "prohibited",
      evidence:
        "docs/rebuild/CONTENT_TRUTH_INVENTORY.md - the headline fabricated metric this whole content-truth discipline exists to exclude. No measurement data exists anywhere in the repository.",
    },
    {
      id: "ready-for-real-world-use",
      statement: "Ready for real-world student use.",
      status: "prohibited",
      evidence: "No user or adoption evidence exists.",
    },
    {
      id: "role",
      statement: "Solo-built, or built as part of a team.",
      status: "pending",
      evidence: "[owner to confirm] - OPEN_DECISIONS.md #12.",
    },
  ],
  limitations: [
    "No performance or outcome metrics are published for this project, because none have been measured.",
    "Source code for this project is not published publicly; the GitHub link on this project is a profile link, not a repository link.",
  ],
  lastReviewed: "2026-08-31",
};
