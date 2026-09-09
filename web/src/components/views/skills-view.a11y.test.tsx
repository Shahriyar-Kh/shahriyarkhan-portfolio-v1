import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SkillsView } from "@/components/views/skills-view";
import type { Project, Skill } from "@/lib/api/types";

const BACKEND = { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" };
const FRONTEND = { id: 2, name: "Frontend", slug: "frontend", display_order: 2, created_at: "", updated_at: "" };

function makeSkill(overrides: Partial<Skill> & { id: number; name: string; category: Skill["category"] }): Skill {
  return {
    description: "",
    level: 3,
    icon_or_badge: "",
    published: true,
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const SKILLS: Skill[] = [
  makeSkill({ id: 1, name: "Python", level: 4, category: BACKEND }),
  makeSkill({ id: 2, name: "Django / DRF", level: 4, category: BACKEND }),
  makeSkill({ id: 3, name: "React.js", level: 3, category: FRONTEND }),
];

const PROJECTS: Project[] = [
  {
    id: 1,
    title: "Yango Wing Fleet",
    slug: "yango-wing-fleet",
    description: "",
    technologies: [{ id: 1, name: "Python", slug: "python" }],
    live_url: "",
    github_url: "",
    preview_image: null,
    featured_image: null,
    alt_text: "",
    ai_summary: "",
    featured: false,
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    display_order: 0,
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    og_title: "",
    og_description: "",
    image_alt_text: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("SkillsView accessibility", () => {
  it("has no axe violations in its populated state (Core Stack, Index, Evidence, Working range all rendering)", async () => {
    const { container } = render(<SkillsView skills={SKILLS} projects={PROJECTS} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its unavailable state", async () => {
    const { container } = render(<SkillsView skills={null} projects={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its empty state", async () => {
    const { container } = render(<SkillsView skills={[]} projects={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
