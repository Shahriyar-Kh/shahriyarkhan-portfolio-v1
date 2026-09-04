import type { CaseStudy } from "@/content/case-studies/types";

export const feelwise: CaseStudy = {
  slug: "feelwise-emotion-detection-system",
  summary: "A microservices-based emotion-detection system with a FastAPI backend and a Node.js API gateway.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement: "Built as separate services: a FastAPI backend, a Node.js API gateway, and a MongoDB datastore.",
          status: "verified",
          evidence: "Live API technologies field (FastAPI, Python, Node.js, MongoDB, JWT).",
        },
        {
          id: "deployment",
          statement: "Deployed on Cloudflare Workers.",
          status: "verified",
          evidence: "Self-evidencing from the live URL's own hostname (feelwise-emotion-detection.feelwise.workers.dev).",
        },
        {
          id: "multimodal",
          statement: "Accepts text, speech, and facial input for emotion detection.",
          status: "inferred",
          evidence: "docs/rebuild/CONTENT_TRUTH_INVENTORY.md - restated from prior project copy, not independently re-tested per input mode.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "feelwise-emotion-detection.feelwise.workers.dev",
      href: "https://feelwise-emotion-detection.feelwise.workers.dev",
      verifiedOn: "2026-08-27",
    },
  ],
  withheld: [
    {
      id: "accuracy-figure",
      statement: "Any accuracy or confidence figure for the emotion-detection models.",
      status: "prohibited",
      evidence: "No accuracy, precision, or confidence measurement exists anywhere in the repository - exactly the kind of claim that must never be invented.",
    },
    {
      id: "model-provenance",
      statement: "Whether the emotion-detection models are self-trained, pretrained, or third-party-licensed.",
      status: "pending",
      evidence: "[owner to confirm] - unanswerable from the repository, and material to what licensing notice may be required.",
    },
    {
      id: "role",
      statement: "Solo-built, or built as part of a team.",
      status: "pending",
      evidence: "[owner to confirm] - OPEN_DECISIONS.md #12.",
    },
  ],
  limitations: [
    "No accuracy or performance figures are published for the emotion-detection models, because none have been independently measured.",
    "Source code for this project is not published publicly; the GitHub link on this project is a profile link, not a repository link.",
  ],
  lastReviewed: "2026-08-31",
};
