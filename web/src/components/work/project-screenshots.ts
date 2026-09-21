/**
 * Local, safety-reviewed project visuals keyed by the live API's
 * Project.slug. A tall public capture can pan inside ProjectFrame;
 * landscape evidence remains a static cover so it is never stretched or
 * presented as a full-page capture. Every entry must have documented
 * provenance and a privacy review in public/images/projects/SOURCES.md.
 *
 * These assets are presentation-only fallbacks for the production API,
 * whose featured_image/preview_image fields may be null. They never alter
 * project facts and they never turn an illustration into evidence. A slug
 * without a reviewed visual continues to receive the honest SkMark tile.
 */
export interface ProjectScreenshot {
  /** Path under /public, e.g. "/images/projects/some-slug.webp". */
  path: string;
  /** Public project URL associated with evidence media; generated
   * illustrations intentionally have no source URL. */
  sourceUrl: string | null;
  sourceKind: "public_capture" | "owner_provided" | "illustrative";
  display: "pan" | "cover";
  alt: string;
  /** Real intrinsic pixel dimensions of the optimized file, so next/image
   * can reserve the correct aspect ratio without a network round trip. */
  width: number;
  height: number;
}

export const PROJECT_SCREENSHOTS: Readonly<Record<string, ProjectScreenshot>> = {
  "nurses-beyond-borders-nclex-learning-exam-preparation-platform": {
    path: "/images/projects/nurses-beyond-borders-nclex-learning-platform.webp",
    sourceUrl: "https://nbb-lms.vercel.app/",
    sourceKind: "owner_provided",
    display: "cover",
    alt: "Nurses Beyond Borders learning dashboard with study, exam, and progress tools",
    width: 1600,
    height: 1000,
  },
  "yango-wing-fleet-digital-registration-fleet-management-platform": {
    path: "/images/projects/yango-wing-fleet-digital-registration-fleet-management-platform.webp",
    sourceUrl: "https://yango-wing-fleet.vercel.app",
    sourceKind: "public_capture",
    display: "pan",
    alt: "Full-page screenshot of the Yango Wing Fleet public platform",
    width: 1280,
    height: 3420,
  },
  "noteassist-ai-productivity-platform": {
    path: "/images/projects/noteassist-ai-productivity-platform.webp",
    sourceUrl: "https://noteassistai.vercel.app",
    sourceKind: "public_capture",
    display: "pan",
    alt: "Full-page screenshot of the NoteAssist AI public product page",
    width: 1280,
    height: 4833,
  },
  "sk-learntrack-ai-learning-platform": {
    path: "/images/projects/sk-learntrack-ai-learning-platform.webp",
    sourceUrl: "https://sk-learntrack.vercel.app",
    sourceKind: "public_capture",
    display: "pan",
    alt: "Full-page screenshot of the SK LearnTrack public learning platform",
    width: 1280,
    height: 3553,
  },
  "feelwise-emotion-detection-system": {
    path: "/images/projects/feelwise-emotion-detection-system.webp",
    sourceUrl: "https://feelwise-emotion-detection.feelwise.workers.dev",
    sourceKind: "public_capture",
    display: "pan",
    alt: "Full-page screenshot of the FeelWise public emotion-analysis platform",
    width: 1280,
    height: 6000,
  },
  "shahriyar-khan-full-stack-portfolio-ai-assistant-platform": {
    path: "/images/projects/shahriyar-khan-portfolio-platform.webp",
    sourceUrl: "https://shahriyarkhan.com",
    sourceKind: "public_capture",
    display: "pan",
    alt: "Full-page screenshot of Shahriyar Khan's engineering portfolio platform",
    width: 1280,
    height: 8192,
  },
  "techbuilt-open-school-multilingual-education-platform-operational-lms": {
    path: "/images/projects/techbuilt-open-school-operational-lms-concept.webp",
    sourceUrl: null,
    sourceKind: "illustrative",
    display: "cover",
    alt: "Concept illustration of a multilingual education and learning operations platform",
    width: 1600,
    height: 1000,
  },
  "techbuilt-open-school-lms-final-year-project": {
    path: "/images/projects/techbuilt-open-school-final-year-project-concept.webp",
    sourceUrl: null,
    sourceKind: "illustrative",
    display: "cover",
    alt: "Concept illustration of a final-year learning management system architecture",
    width: 1600,
    height: 1000,
  },
  "advanced-restaurant-management-system": {
    path: "/images/projects/advanced-restaurant-management-system-concept.webp",
    sourceUrl: null,
    sourceKind: "illustrative",
    display: "cover",
    alt: "Concept illustration of an advanced restaurant operations management system",
    width: 1600,
    height: 1000,
  },
};
