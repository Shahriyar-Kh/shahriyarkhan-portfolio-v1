// FINAL-DESIGN-01A-R6-FIX: pure, framework-free logic shared by
// scripts/verify-review-ready.mjs (drives a real browser against a
// running production server) and its vitest unit tests
// (src/lib/review-readiness.test.ts). Plain JS (not TypeScript) so a
// bare `node` process can import it directly with no build step, exactly
// like this project's other review scripts (smoke-routes.mjs,
// check-links.mjs).

export const FALLBACK_MESSAGES = [
  "Project data is temporarily unavailable.",
  "Service data is temporarily unavailable.",
  "Skill data is temporarily unavailable.",
  "Experience data is temporarily unavailable.",
];

/** @param {string} html */
export function findFallbackMessages(html) {
  return FALLBACK_MESSAGES.filter((message) => html.includes(message));
}

/**
 * @typedef {object} ReviewReadinessDomChecks
 * @property {number} projectCount
 * @property {boolean} projectHasText
 * @property {boolean} projectHasImage
 * @property {number} serviceCount
 * @property {boolean} serviceHasLink
 * @property {boolean} serviceHasImage
 * @property {number} skillGroupCount
 * @property {boolean} skillHasText
 * @property {number} experienceCount
 * @property {boolean} experienceHasText
 */

/**
 * Never hardcodes an exact count (project/service/skill/experience totals
 * can legitimately change) - every check is "at least one representative
 * record with the expected shape/fields", matching the R6-FIX brief's
 * explicit instruction.
 *
 * @param {string} html
 * @param {ReviewReadinessDomChecks} dom
 * @returns {string[]} failures - empty means the page is review-ready
 */
export function evaluateReviewReadiness(html, dom) {
  const failures = [];

  for (const message of findFallbackMessages(html)) {
    failures.push(`Fallback message present: "${message}"`);
  }

  if (dom.projectCount < 1 || !dom.projectHasText) {
    failures.push(`No representative project record found (project links: ${dom.projectCount}).`);
  }
  if (!dom.projectHasImage) {
    failures.push("No project image rendered on the homepage.");
  }

  if (dom.serviceCount < 1 || !dom.serviceHasLink) {
    failures.push(`No representative service record found (service cards: ${dom.serviceCount}).`);
  }
  if (!dom.serviceHasImage) {
    failures.push("No R6 service raster image rendered - the real-image service cards may be missing.");
  }

  if (dom.skillGroupCount < 1 || !dom.skillHasText) {
    failures.push(`No representative skill record found (skill category groups: ${dom.skillGroupCount}).`);
  }

  if (dom.experienceCount < 1 || !dom.experienceHasText) {
    failures.push(`No representative experience record found (experience rows: ${dom.experienceCount}).`);
  }

  return failures;
}
