import { describe, expect, it } from "vitest";
// Plain-JS shared module (see scripts/lib/review-readiness-checks.mjs's
// own header comment for why it lives outside src/ and has no build step).
import { evaluateReviewReadiness, findFallbackMessages } from "../../scripts/lib/review-readiness-checks.mjs";

const GOOD_DOM = {
  projectCount: 6,
  projectHasText: true,
  projectHasImage: true,
  serviceCount: 7,
  serviceHasLink: true,
  serviceHasImage: true,
  skillGroupCount: 5,
  skillHasText: true,
  experienceCount: 3,
  experienceHasText: true,
};

describe("findFallbackMessages", () => {
  it("detects every one of the four required fallback messages independently", () => {
    expect(findFallbackMessages("<p>Project data is temporarily unavailable.</p>")).toEqual(["Project data is temporarily unavailable."]);
    expect(findFallbackMessages("<p>Service data is temporarily unavailable.</p>")).toEqual(["Service data is temporarily unavailable."]);
    expect(findFallbackMessages("<p>Skill data is temporarily unavailable.</p>")).toEqual(["Skill data is temporarily unavailable."]);
    expect(findFallbackMessages("<p>Experience data is temporarily unavailable.</p>")).toEqual(["Experience data is temporarily unavailable."]);
  });

  it("detects all four at once - the exact owner-reported failure", () => {
    const html = [
      "Project data is temporarily unavailable.",
      "Service data is temporarily unavailable.",
      "Skill data is temporarily unavailable.",
      "Experience data is temporarily unavailable.",
    ].join(" ");
    expect(findFallbackMessages(html)).toHaveLength(4);
  });

  it("finds nothing in a clean, fully-rendered page", () => {
    expect(findFallbackMessages("<h2>Selected work</h2><h2>Technical capability</h2>")).toEqual([]);
  });
});

describe("evaluateReviewReadiness", () => {
  it("passes (empty failure list) when every dataset is present and no fallback message exists", () => {
    expect(evaluateReviewReadiness("<html>real content</html>", GOOD_DOM)).toEqual([]);
  });

  it("fails when any fallback message is present, even with otherwise-good DOM checks", () => {
    const failures = evaluateReviewReadiness("Project data is temporarily unavailable.", GOOD_DOM);
    expect(failures.some((f) => f.includes("Project data is temporarily unavailable"))).toBe(true);
  });

  it("fails when all four fallback messages are present simultaneously (the exact owner-reported bug)", () => {
    const html = [
      "Project data is temporarily unavailable.",
      "Service data is temporarily unavailable.",
      "Skill data is temporarily unavailable.",
      "Experience data is temporarily unavailable.",
    ].join(" ");
    const failures = evaluateReviewReadiness(html, {
      projectCount: 0,
      projectHasText: false,
      projectHasImage: false,
      serviceCount: 0,
      serviceHasLink: false,
      serviceHasImage: false,
      skillGroupCount: 0,
      skillHasText: false,
      experienceCount: 0,
      experienceHasText: false,
    });
    expect(failures.length).toBeGreaterThanOrEqual(8);
  });

  it("requires a representative project record - fails on zero project links even without a fallback message", () => {
    const failures = evaluateReviewReadiness("<html></html>", { ...GOOD_DOM, projectCount: 0, projectHasText: false });
    expect(failures.some((f) => f.includes("project record"))).toBe(true);
  });

  it("requires a representative service record with the R6 raster image present", () => {
    const failures = evaluateReviewReadiness("<html></html>", { ...GOOD_DOM, serviceHasImage: false });
    expect(failures.some((f) => f.includes("R6 service raster image"))).toBe(true);
  });

  it("requires a representative skill record", () => {
    const failures = evaluateReviewReadiness("<html></html>", { ...GOOD_DOM, skillGroupCount: 0, skillHasText: false });
    expect(failures.some((f) => f.includes("skill record"))).toBe(true);
  });

  it("requires a representative experience record", () => {
    const failures = evaluateReviewReadiness("<html></html>", { ...GOOD_DOM, experienceCount: 0, experienceHasText: false });
    expect(failures.some((f) => f.includes("experience record"))).toBe(true);
  });

  it("never hardcodes an exact count - any count >= 1 with real text/image passes", () => {
    expect(evaluateReviewReadiness("<html></html>", { ...GOOD_DOM, projectCount: 1, serviceCount: 1, skillGroupCount: 1, experienceCount: 1 })).toEqual([]);
  });
});
