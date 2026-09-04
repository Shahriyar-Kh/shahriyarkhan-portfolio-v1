import type { CaseStudy } from "@/content/case-studies/types";

/**
 * NOTE ON FILENAME: this file is keyed by the slug used inside it
 * (case-studies.test.ts enforces slug === filename-derived key via
 * index.ts, not the filename itself), matching the live API's actual
 * slug "yango-wing-fleet-digital-registration-fleet-management-platform".
 */
export const yangoWingFleet: CaseStudy = {
  slug: "yango-wing-fleet-digital-registration-fleet-management-platform",
  summary:
    "A registration and fleet-operations platform with a public onboarding flow and an authenticated admin dashboard.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement:
            "Built with React and Django REST Framework, using PostgreSQL for storage and JWT for authentication.",
          status: "verified",
          evidence: "Live API technologies field (Django, DRF, PostgreSQL, React.js, JWT, Python, REST APIs).",
        },
        {
          id: "split",
          statement: "The system separates a public registration flow from an authenticated admin area.",
          status: "verified",
          evidence: "docs/rebuild/P01A4_CONTENT_AND_MEDIA_AUDIT.md - audited screenshots of both areas.",
        },
      ],
    },
    {
      key: "features",
      heading: "What it does",
      claims: [
        {
          id: "modules",
          statement: "The admin area includes registration, offers, and inquiry management as distinct modules.",
          status: "inferred",
          evidence: "docs/rebuild/CONTENT_TRUTH_INVENTORY.md - restated conservatively from prior project copy, not independently re-verified against the running app.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "yango-wing-fleet.vercel.app",
      href: "https://yango-wing-fleet.vercel.app",
      verifiedOn: "2026-08-27",
    },
    {
      kind: "screenshot",
      label: "Public registration flow",
      href: "",
      verifiedOn: null,
      capturedApprox: "April 2026",
    },
  ],
  withheld: [
    {
      id: "problem-framing",
      statement: "Fleet teams needed one system instead of scattered forms and manual spreadsheets.",
      status: "pending",
      evidence: "Asserts a client's prior state with no client statement on record (OPEN_DECISIONS.md #13).",
    },
    {
      id: "role",
      statement: "Solo-built, or built as part of a team.",
      status: "pending",
      evidence: "[owner to confirm] - OPEN_DECISIONS.md #12.",
    },
    {
      id: "operational-counts",
      statement: "Any registration or usage counts.",
      status: "prohibited",
      evidence: "Third-party operational data; not this site's to publish.",
    },
    {
      id: "sensitive-screenshot",
      statement: "The removed registration-management table screenshot.",
      status: "prohibited",
      evidence: "docs/rebuild/P01A5H_PRIVACY_HOTFIX_REPORT.md - contained apparent real personal data; file deleted from the deployable tree.",
    },
    {
      id: "brand-permission",
      statement: "Publishing this project's third-party brand and UI in detail.",
      status: "pending",
      evidence: "OPEN_DECISIONS.md #11 - audit could not confirm the absence of a confidentiality obligation.",
    },
  ],
  limitations: [
    "This page describes a system built for a third party. It does not publish operational data, customer records, or usage figures.",
    "The GitHub link on this project is a profile link, not a link to this project's own repository.",
    "The scope of my individual contribution on this project is not asserted here.",
  ],
  lastReviewed: "2026-08-31",
};
