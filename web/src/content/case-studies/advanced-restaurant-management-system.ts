import type { CaseStudy } from "@/content/case-studies/types";

export const advancedRms: CaseStudy = {
  slug: "advanced-restaurant-management-system",
  summary: "A desktop application for restaurant operations - inventory, order tracking, and reporting.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement: "Built as a Python desktop application using PyQt5 for the interface and SQLite for storage.",
          status: "verified",
          evidence: "Live API technologies field (Django, Python, PyQt5, SQLite).",
        },
        {
          id: "no-live-url",
          statement: "This is a desktop application, so there is no live URL to visit.",
          status: "verified",
          evidence: "docs/rebuild/CONTENT_TRUTH_INVENTORY.md - 'Not applicable (no live URL claimed)', by design, not an omission.",
        },
      ],
    },
    {
      key: "features",
      heading: "What it does",
      claims: [
        {
          id: "modules",
          statement: "Covers inventory, order tracking, and reporting views.",
          status: "inferred",
          evidence: "docs/rebuild/CONTENT_TRUTH_INVENTORY.md - restated conservatively from prior project copy.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "screenshot",
      label: "Order and inventory views",
      href: "",
      verifiedOn: null,
    },
  ],
  withheld: [
    {
      id: "real-restaurant-use",
      statement: "Whether it was ever used by a real restaurant.",
      status: "pending",
      evidence: "[owner to confirm] - OPEN_DECISIONS.md #13.",
    },
    {
      id: "stack-rationale",
      statement: "Why Django, PyQt5, and SQLite were chosen together for a desktop application.",
      status: "pending",
      evidence: "[owner to confirm] - an unusual combination whose rationale would be genuinely strong content, but only the owner can supply it.",
    },
    {
      id: "role",
      statement: "Solo-built, or built as part of a team.",
      status: "pending",
      evidence: "[owner to confirm] - OPEN_DECISIONS.md #12.",
    },
  ],
  limitations: [
    "This is a desktop application, so there is no live URL to visit. The screenshots are the primary evidence.",
    "Source code for this project is not published publicly; the GitHub link on this project is a profile link, not a repository link.",
  ],
  lastReviewed: "2026-08-31",
};
