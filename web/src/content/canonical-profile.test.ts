import { describe, expect, it } from "vitest";
import { ABOUT_SPECIALIZATION_FALLBACK } from "@/content/about";
import { CASE_STUDIES } from "@/content/case-studies";
import { HERO_ROLES } from "@/content/home";
import { SERVICE_FRAMING } from "@/content/services";
import { SOCIAL_LINKS } from "@/content/site";
import { personSchema } from "@/lib/json-ld";

describe("canonical public profile", () => {
  it("uses the canonical LinkedIn URL everywhere the site constants feed", () => {
    expect(SOCIAL_LINKS.linkedin).toBe("https://www.linkedin.com/in/shahriyar-kh/");
    expect(SOCIAL_LINKS.linkedin).not.toContain("shahriyarkhan786");
    expect(SOCIAL_LINKS.linkedin).not.toContain("shahriyar-khan-developer");
  });

  it("keeps the recruiter positioning backend-first without junior inflation/deflation labels", () => {
    expect(HERO_ROLES).toEqual([
      "Software Engineer",
      "Backend Engineer",
      "Python & Django Developer",
    ]);
    expect(ABOUT_SPECIALIZATION_FALLBACK).toMatch(/python/i);
    expect(ABOUT_SPECIALIZATION_FALLBACK).toMatch(/django/i);
    expect(JSON.stringify(HERO_ROLES)).not.toMatch(/junior/i);
  });

  it("publishes only the six canonical service framings", () => {
    expect(Object.keys(SERVICE_FRAMING).sort()).toEqual(
      [
        "application-development",
        "cloud-application-development",
        "custom-software-development",
        "database-development",
        "saas-development",
        "web-development",
      ].sort(),
    );
  });

  it("registers the current flagship and historical generations as distinct case studies", () => {
    expect(CASE_STUDIES).toHaveProperty(
      "nurses-beyond-borders-nclex-learning-exam-preparation-platform",
    );
    expect(CASE_STUDIES).toHaveProperty(
      "shahriyar-khan-full-stack-portfolio-ai-assistant-platform",
    );
    expect(CASE_STUDIES).toHaveProperty(
      "techbuilt-open-school-multilingual-education-platform-operational-lms",
    );
    expect(CASE_STUDIES).toHaveProperty(
      "techbuilt-open-school-lms-final-year-project",
    );
  });

  it("keeps SK LearnTrack's current provider wording on Groq, with OpenAI only historical/withheld", () => {
    const study = CASE_STUDIES["sk-learntrack-ai-learning-platform"];
    expect(study).toBeDefined();
    if (!study) throw new Error("SK LearnTrack case study is missing");
    expect(study.summary).toMatch(/groq/i);
    expect(study.summary).not.toMatch(/openai/i);
    const renderable = study.sections
      .flatMap((section) => section.claims)
      .map((claim) => claim.statement)
      .join(" ");
    expect(renderable).toMatch(/groq/i);
    expect(renderable).not.toMatch(/current product is openai-powered/i);
  });

  it("emits canonical professional profiles and truthful engineering topics in Person JSON-LD", () => {
    const schema = personSchema();
    expect(schema.sameAs).toEqual([
      "https://github.com/Shahriyar-Kh",
      "https://www.linkedin.com/in/shahriyar-kh/",
    ]);
    expect(schema.knowsAbout).toContain("Django REST Framework");
    expect(schema.knowsAbout).toContain("PostgreSQL");
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("award");
  });
});
