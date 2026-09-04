/**
 * Local, homepage-only tall-screenshot assets for ProjectFrame's
 * hover/focus pan (FINAL-DESIGN-01A-R3 §C). Keyed by the live API's
 * Project.slug - never a backend/database change; every other consumer
 * of this project's media (the API's own featured_image/preview_image,
 * `/work`'s grid via ProjectCard) is untouched.
 *
 * Every entry here corresponds to a real, safety-reviewed capture of the
 * project's own documented `live_url`, taken via
 * scripts/capture-project-screenshots.mjs - see
 * public/images/projects/SOURCES.md for the source URL, capture date,
 * and privacy-check confirmation for each file, and
 * test-guards/project-screenshot-provenance.test.ts for the mechanical
 * guard that every entry here has a matching documented source. A slug
 * with no entry here (no public live URL to safely capture from, or no
 * capture attempted yet) simply falls back to the project's real API
 * image or the typographic SkMark tile - never a fabricated screenshot.
 *
 * The Yango Wing Fleet capture is deliberately shorter than its full
 * page: the live site's own "real office, real people" section (photos
 * of a physical premises) was trimmed out before this file was ever
 * committed - out of caution given this project's documented privacy
 * history (docs/rebuild/P01A5H_PRIVACY_HOTFIX_REPORT.md), even though
 * that section is the business's own public marketing photography, not
 * the kind of customer data that incident was about.
 */
export interface ProjectScreenshot {
  /** Path under /public, e.g. "/images/projects/some-slug.webp". */
  path: string;
  /** The exact live_url this was captured from. */
  sourceUrl: string;
  /** Real intrinsic pixel dimensions of the optimized file, so next/image
   * can reserve the correct aspect ratio without a network round trip. */
  width: number;
  height: number;
}

export const PROJECT_SCREENSHOTS: Readonly<Record<string, ProjectScreenshot>> = {
  "yango-wing-fleet-digital-registration-fleet-management-platform": {
    path: "/images/projects/yango-wing-fleet-digital-registration-fleet-management-platform.webp",
    sourceUrl: "https://yango-wing-fleet.vercel.app",
    width: 1280,
    height: 3420,
  },
  "noteassist-ai-productivity-platform": {
    path: "/images/projects/noteassist-ai-productivity-platform.webp",
    sourceUrl: "https://noteassistai.vercel.app",
    width: 1280,
    height: 4833,
  },
  "sk-learntrack-ai-learning-platform": {
    path: "/images/projects/sk-learntrack-ai-learning-platform.webp",
    sourceUrl: "https://sk-learntrack.vercel.app",
    width: 1280,
    height: 3553,
  },
  "feelwise-emotion-detection-system": {
    path: "/images/projects/feelwise-emotion-detection-system.webp",
    sourceUrl: "https://feelwise-emotion-detection.feelwise.workers.dev",
    width: 1280,
    height: 6000,
  },
};
