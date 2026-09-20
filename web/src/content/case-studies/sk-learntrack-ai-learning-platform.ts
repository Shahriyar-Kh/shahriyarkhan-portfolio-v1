import type { CaseStudy } from "@/content/case-studies/types";

export const skLearntrack: CaseStudy = {
  slug: "sk-learntrack-ai-learning-platform",
  summary:
    "A full-stack learning and course-management platform with structured progression, progress tracking, analytics, and Groq-powered study assistance.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        {
          id: "stack",
          statement:
            "Built with Django REST Framework and React, backed by PostgreSQL with JWT authentication and pytest-backed backend testing.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/SK_LearnTrack README and repository evidence reviewed 2026-09-21.",
        },
        {
          id: "learning-structure",
          statement:
            "The product models learning as Course → Chapter → Topic and supports authoring, enrollment, progress, quizzes, notes, bookmarks, roadmaps, and analytics.",
          status: "verified",
          evidence:
            "github.com/Shahriyar-Kh/SK_LearnTrack README and current project implementation evidence reviewed 2026-09-21.",
        },
        {
          id: "groq-current",
          statement:
            "The current AI-assisted learning workflow uses Groq; OpenAI was used earlier in development and is historical rather than the current runtime provider.",
          status: "verified",
          evidence:
            "Owner-approved canonical provider history and github.com/Shahriyar-Kh/SK_LearnTrack, 2026-09-21.",
        },
      ],
    },
  ],
  evidence: [
    {
      kind: "live",
      label: "sk-learntrack.vercel.app",
      href: "https://sk-learntrack.vercel.app",
      verifiedOn: "2026-09-21",
    },
    {
      kind: "repo",
      label: "GitHub repository",
      href: "https://github.com/Shahriyar-Kh/SK_LearnTrack",
      verifiedOn: "2026-09-21",
    },
  ],
  withheld: [
    {
      id: "sixty-percent-metric",
      statement: "AI assistance reduces time-to-answer by over 60% compared to traditional search.",
      status: "prohibited",
      evidence: "No measurement data supports this outcome claim.",
    },
    {
      id: "openai-current",
      statement: "The current product is OpenAI-powered.",
      status: "prohibited",
      evidence: "The active AI workflow moved to Groq; OpenAI is historical integration context only.",
    },
  ],
  limitations: [
    "No learning-speed, adoption, or outcome metric is published because none has been independently measured.",
    "OpenAI may be referenced only as earlier integration history; current provider wording is Groq.",
  ],
  lastReviewed: "2026-09-21",
};
