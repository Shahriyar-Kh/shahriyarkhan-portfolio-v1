import type { CaseStudy } from "@/content/case-studies/types";

export const yangoWingFleet: CaseStudy = {
  slug: "yango-wing-fleet-digital-registration-fleet-management-platform",
  summary:
    "A full-stack driver-registration and fleet-operations platform with public onboarding workflows, staff-protected APIs, administration, analytics, filtering, and exports.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement:
            "Built with Django REST Framework and React/TypeScript, using PostgreSQL for persistence and JWT for authenticated staff workflows.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/yango-wing-fleet README and repository evidence reviewed 2026-09-21.",
        },
        {
          id: "public-admin-split",
          statement:
            "The system separates public registration and inquiry flows from protected staff operations and dashboard APIs.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/yango-wing-fleet README and API surface reviewed 2026-09-21.",
        },
      ],
    },
    {
      key: "features",
      heading: "Operational workflows",
      claims: [
        {
          id: "operations",
          statement:
            "Staff workflows include registration and inquiry management, offers/trip-bonus CRUD, search and filtering, status updates, password reset, email workflows, dashboard analytics, and CSV exports.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/yango-wing-fleet README and current implementation evidence reviewed 2026-09-21.",
        },
        {
          id: "polling",
          statement:
            "Dashboard refresh uses interval-based polling for updated operational data rather than WebSocket push.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/yango-wing-fleet README explicitly documents polling-based dashboard refresh.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "yango-wing-fleet.vercel.app",
      href: "https://yango-wing-fleet.vercel.app",
      verifiedOn: "2026-09-21",
    },
    {
      kind: "repo",
      label: "GitHub repository",
      href: "https://github.com/Shahriyar-Kh/yango-wing-fleet",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "customer-data",
      statement: "Operational registration/customer records or usage counts.",
      status: "prohibited",
      evidence: "Third-party operational data is not public portfolio content.",
    },
    {
      id: "real-time",
      statement: "The dashboard uses real-time push/WebSockets.",
      status: "prohibited",
      evidence: "The implemented refresh mechanism is polling, not push infrastructure.",
    },
  ],
  limitations: [
    "This client/business project does not publish customer records, operational counts, or sensitive admin screenshots.",
    "Polling is described as polling; no WebSocket or real-time push claim is made.",
  ],
  lastReviewed: "2026-09-21",
  projectContext: "client",
};
