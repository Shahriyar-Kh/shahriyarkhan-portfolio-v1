import { describe, expect, it } from "vitest";
import { CASE_STUDIES } from "@/content/case-studies";

const FORBIDDEN_TERMS = [
  "aws certif",
  "senior software engineer",
  "enterprise-grade",
  "production-grade",
  "reduces time-to-answer",
  "happy clients",
  "projects built",
];

function renderableText(caseStudy: (typeof CASE_STUDIES)[string]): string {
  const parts: string[] = [caseStudy.summary];
  for (const section of caseStudy.sections) {
    for (const claim of section.claims) {
      if (claim.status === "verified" || claim.status === "inferred") parts.push(claim.statement);
    }
  }
  parts.push(...caseStudy.limitations);
  return parts.join(" \n ").toLowerCase();
}

describe("case-study claim register", () => {
  const entries = Object.entries(CASE_STUDIES);

  it("has at least one case study", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("keys each entry by its own slug", () => {
    for (const [key, caseStudy] of entries) {
      expect(caseStudy.slug).toBe(key);
    }
  });

  it("has unique slugs", () => {
    const slugs = entries.map(([key]) => key);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every verified claim non-empty evidence", () => {
    for (const [, caseStudy] of entries) {
      for (const section of caseStudy.sections) {
        for (const claim of section.claims) {
          if (claim.status === "verified") {
            expect(claim.evidence.trim().length, `${caseStudy.slug}/${claim.id} evidence`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("never lets a pending or prohibited claim appear in a renderable sections[].claims array", () => {
    for (const [, caseStudy] of entries) {
      for (const section of caseStudy.sections) {
        for (const claim of section.claims) {
          expect(["verified", "inferred"]).toContain(claim.status);
        }
      }
    }
  });

  it("never lets a forbidden term appear in renderable copy", () => {
    for (const [, caseStudy] of entries) {
      const text = renderableText(caseStudy);
      for (const term of FORBIDDEN_TERMS) {
        expect(text, `${caseStudy.slug} contains forbidden term "${term}"`).not.toContain(term);
      }
    }
  });

  it("withheld claims are all pending or prohibited (never verified/inferred hiding in the wrong array)", () => {
    for (const [, caseStudy] of entries) {
      for (const claim of caseStudy.withheld) {
        expect(["pending", "prohibited"]).toContain(claim.status);
      }
    }
  });
});
