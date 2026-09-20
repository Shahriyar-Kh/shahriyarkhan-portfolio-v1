import type { CaseStudy } from "@/content/case-studies/types";

export const feelwise: CaseStudy = {
  slug: "feelwise-emotion-detection-system",
  summary:
    "A multi-service AI emotion-analysis platform coordinating text, facial-expression, speech, and journal workflows through a Node.js/Express gateway and specialized Python services.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "service-boundaries",
          statement:
            "The system runs separate FastAPI services behind a Node.js/Express API gateway, with MongoDB used for application data.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/feelwise-emotion-detection README and repository evidence reviewed 2026-09-21.",
        },
        {
          id: "modalities",
          statement:
            "Dedicated workflows handle text, facial-expression, speech, and journal analysis rather than routing every input through one process.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/feelwise-emotion-detection repository structure and README reviewed 2026-09-21.",
        },
        {
          id: "ml-stack",
          statement:
            "The verified engineering stack includes PyTorch, DeepFace, Wav2Vec2, OpenCV, FastAPI, Node.js/Express, MongoDB, and JWT-based authentication.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/feelwise-emotion-detection README reviewed 2026-09-21.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "feelwise-emotion-detection.feelwise.workers.dev",
      href: "https://feelwise-emotion-detection.feelwise.workers.dev",
      verifiedOn: "2026-09-21",
    },
    {
      kind: "repo",
      label: "GitHub repository",
      href: "https://github.com/Shahriyar-Kh/feelwise-emotion-detection",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "accuracy-figure",
      statement: "Any accuracy, confidence, diagnostic, or clinical-performance figure.",
      status: "prohibited",
      evidence: "No independently measured accuracy/clinical validation supports such a claim.",
    },
    {
      id: "clinical-diagnosis",
      statement: "The platform diagnoses a mental-health or medical condition.",
      status: "prohibited",
      evidence: "The project is presented as emotion analysis/emotional-awareness software, not a clinical diagnostic system.",
    },
  ],
  limitations: [
    "No model-accuracy or clinical-performance claim is published without measured evidence.",
    "The project is described as emotion analysis, not medical or psychological diagnosis.",
  ],
  lastReviewed: "2026-09-21",
};
