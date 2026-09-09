import { describe, expect, it } from "vitest";
import { buildSkillEvidence } from "@/lib/skill-evidence";
import type { Project, Skill } from "@/lib/api/types";

function makeSkill(overrides: Partial<Skill> & { id: number; name: string }): Skill {
  return {
    description: "",
    level: 3,
    icon_or_badge: "",
    category: { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" },
    published: true,
    display_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> & { id: number; slug: string; title: string; technologies: Project["technologies"] }): Project {
  return {
    description: "",
    live_url: "",
    github_url: "",
    preview_image: null,
    featured_image: null,
    alt_text: "",
    ai_summary: "",
    featured: false,
    status: "published",
    published_at: null,
    display_order: 0,
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    og_title: "",
    og_description: "",
    image_alt_text: "",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function tech(id: number, name: string) {
  return { id, name, slug: name.toLowerCase() };
}

describe("buildSkillEvidence", () => {
  it("matches a skill to a project only through the project's real technologies field", () => {
    const python = makeSkill({ id: 1, name: "Python" });
    const yango = makeProject({ id: 1, slug: "yango", title: "Yango", technologies: [tech(1, "Django"), tech(2, "Python")] });
    const feelwise = makeProject({ id: 2, slug: "feelwise", title: "FeelWise", technologies: [tech(3, "FastAPI"), tech(4, "Python")] });
    const noteassist = makeProject({ id: 3, slug: "noteassist", title: "NoteAssist", technologies: [tech(5, "Django"), tech(6, "Redis")] });

    const result = buildSkillEvidence([python], [yango, feelwise, noteassist]);

    expect(result).toHaveLength(1);
    expect(result[0]!.skill.name).toBe("Python");
    expect(result[0]!.projects.map((p) => p.slug).sort()).toEqual(["feelwise", "yango"]);
  });

  it("normalizes an obvious spelling variant (React.js vs React), never a guessed equivalence", () => {
    const reactJs = makeSkill({ id: 1, name: "React.js" });
    const withReact = makeProject({ id: 1, slug: "sk-learntrack", title: "SK-LearnTrack", technologies: [tech(1, "React"), tech(2, "Django")] });
    const withReactJs = makeProject({ id: 2, slug: "yango", title: "Yango", technologies: [tech(3, "React.js")] });
    const withoutReact = makeProject({ id: 3, slug: "feelwise", title: "FeelWise", technologies: [tech(4, "Node.js")] });

    const result = buildSkillEvidence([reactJs], [withReact, withReactJs, withoutReact]);

    expect(result).toHaveLength(1);
    expect(result[0]!.projects.map((p) => p.slug).sort()).toEqual(["sk-learntrack", "yango"]);
  });

  it("matches a combined skill (Django / DRF) against either real technology token", () => {
    const djangoDrf = makeSkill({ id: 1, name: "Django / DRF" });
    const withBoth = makeProject({ id: 1, slug: "yango", title: "Yango", technologies: [tech(1, "Django"), tech(2, "DRF")] });
    const withDjangoOnly = makeProject({ id: 2, slug: "advanced-rms", title: "Advanced RMS", technologies: [tech(3, "Django")] });
    const withNeither = makeProject({ id: 3, slug: "feelwise", title: "FeelWise", technologies: [tech(4, "FastAPI")] });

    const result = buildSkillEvidence([djangoDrf], [withBoth, withDjangoOnly, withNeither]);

    expect(result[0]!.projects.map((p) => p.slug).sort()).toEqual(["advanced-rms", "yango"]);
  });

  it("omits a skill entirely when no real project's technologies field supports it - never a fabricated relationship", () => {
    const docker = makeSkill({ id: 1, name: "Docker" });
    const noDocker = makeProject({ id: 1, slug: "yango", title: "Yango", technologies: [tech(1, "Django"), tech(2, "PostgreSQL")] });

    const result = buildSkillEvidence([docker], [noDocker]);

    expect(result).toHaveLength(0);
  });

  it("never lets a short token produce a false-positive substring match", () => {
    // "Git / GitHub" tokenizes to ["git", "github"] - both are real,
    // meaningful tokens (length >= 3), but must still require a genuine
    // technology match, not fire on an unrelated technology name.
    const git = makeSkill({ id: 1, name: "Git / GitHub" });
    const unrelated = makeProject({ id: 1, slug: "yango", title: "Yango", technologies: [tech(1, "Django"), tech(2, "REST APIs")] });

    const result = buildSkillEvidence([git], [unrelated]);

    expect(result).toHaveLength(0);
  });

  it("returns projects in the order the caller supplies them, one entry per skill with evidence", () => {
    const python = makeSkill({ id: 1, name: "Python" });
    const mongo = makeSkill({ id: 2, name: "MongoDB" });
    const feelwise = makeProject({ id: 1, slug: "feelwise", title: "FeelWise", technologies: [tech(1, "Python"), tech(2, "MongoDB")] });

    const result = buildSkillEvidence([python, mongo], [feelwise]);

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.skill.name)).toEqual(["Python", "MongoDB"]);
  });
});
