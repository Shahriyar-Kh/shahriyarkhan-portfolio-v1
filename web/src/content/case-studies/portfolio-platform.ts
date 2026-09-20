import type { CaseStudy } from "@/content/case-studies/types";

export const portfolioPlatform: CaseStudy = {
  slug: "shahriyar-khan-full-stack-portfolio-ai-assistant-platform",
  summary:
    "A full-stack professional portfolio platform with dynamic content, administration, SEO/JSON-LD, a grounded visitor assistant, structured project discovery, and private CV-management workflows.",
  sections: [
    {
      key: "architecture",
      heading: "Platform architecture",
      claims: [
        {
          id: "stack",
          statement:
            "The platform uses Next.js 16/React 19 on the frontend and Django/DRF with PostgreSQL on the backend, deployed through Cloudflare Workers and Railway.",
          status: "verified",
          evidence: "This repository README and production-stack configuration reviewed 2026-09-21.",
        },
        {
          id: "server-driven",
          statement:
            "Projects, services, skills, experience, SEO configuration, and public assistant evidence are managed through backend-driven content rather than a static portfolio-only frontend.",
          status: "verified",
          evidence: "Current repository architecture and README reviewed 2026-09-21.",
        },
        {
          id: "assistant",
          statement:
            "The visitor assistant is grounded in published portfolio evidence and excludes private inquiry, account, and résumé data from its public context.",
          status: "verified",
          evidence: "backend/apps/assistant and repository security/grounding documentation.",
        },
        {
          id: "cv-builder",
          statement:
            "Private administration includes CV management and controlled PDF/DOCX document export workflows.",
          status: "verified",
          evidence: "backend/apps/resume_builder and repository README reviewed 2026-09-21.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "shahriyarkhan.com",
      href: "https://shahriyarkhan.com/",
      verifiedOn: "2026-09-21",
    },
    {
      kind: "repo",
      label: "GitHub repository",
      href: "https://github.com/Shahriyar-Kh/shahriyarkhan-portfolio-v1",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "public-ats",
      statement: "Public visitors can use ATS scoring, job-description matching, resume assessments, or internal job-application tooling.",
      status: "prohibited",
      evidence: "Owner-approved public boundary: these internal capabilities are not marketed or exposed as public portfolio features.",
    },
  ],
  limitations: [
    "Public copy describes CV Builder/CV management and document exports only; internal ATS/job-matching capabilities remain private.",
  ],
  lastReviewed: "2026-09-21",
};
