import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SkillsCapability } from "@/components/sections/skills-capability";
import { CategoryIcon, CoreStackIcon } from "@/components/icons/tech-icons";
import type { Skill } from "@/lib/api/types";

function makeSkill(overrides: Partial<Skill>): Skill {
  return {
    id: 1,
    name: "React",
    description: "",
    level: 3,
    icon_or_badge: "",
    category: {
      id: 1,
      name: "Frontend",
      slug: "frontend",
      display_order: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    published: true,
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const SIX_CATEGORY_SKILLS: Skill[] = [
  makeSkill({ id: 1, name: "React.js", category: { id: 1, name: "Frontend", slug: "frontend", display_order: 1, created_at: "", updated_at: "" } }),
  makeSkill({ id: 2, name: "Next.js", category: { id: 1, name: "Frontend", slug: "frontend", display_order: 1, created_at: "", updated_at: "" } }),
  makeSkill({ id: 3, name: "Python", category: { id: 2, name: "Backend", slug: "backend", display_order: 2, created_at: "", updated_at: "" } }),
  makeSkill({ id: 4, name: "Django", category: { id: 2, name: "Backend", slug: "backend", display_order: 2, created_at: "", updated_at: "" } }),
  makeSkill({ id: 5, name: "PostgreSQL", category: { id: 3, name: "Database", slug: "database", display_order: 3, created_at: "", updated_at: "" } }),
  makeSkill({ id: 6, name: "Redis", category: { id: 3, name: "Database", slug: "database", display_order: 3, created_at: "", updated_at: "" } }),
  makeSkill({ id: 7, name: "Software Architecture", category: { id: 4, name: "Engineering", slug: "engineering", display_order: 4, created_at: "", updated_at: "" } }),
  makeSkill({ id: 8, name: "Docker", category: { id: 5, name: "Tools", slug: "tools", display_order: 5, created_at: "", updated_at: "" } }),
  makeSkill({ id: 9, name: "Git", category: { id: 5, name: "Tools", slug: "tools", display_order: 5, created_at: "", updated_at: "" } }),
  makeSkill({ id: 10, name: "Cloudflare Workers", category: { id: 6, name: "Deployment", slug: "deployment", display_order: 6, created_at: "", updated_at: "" } }),
];

describe("SkillsCapability", () => {
  it("renders the 5 core technologies without proficiency or level UI", () => {
    render(<SkillsCapability skills={SIX_CATEGORY_SKILLS} />);
    expect(screen.getByText("Core Stack")).toBeInTheDocument();
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Django").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PostgreSQL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("React.js").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Docker").length).toBeGreaterThan(0);

    // Verify all proficiency/level UI is removed
    expect(screen.queryByText(/Advanced|Intermediate|Expert|Beginner/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/— (Expert|Advanced|Intermediate)/i)).not.toBeInTheDocument();
  });

  it("renders exactly 3 showcase category cards by default (Frontend, Backend, Database)", () => {
    const { container } = render(<SkillsCapability skills={SIX_CATEGORY_SKILLS} />);
    const cards = container.querySelectorAll("[data-category-card]");
    expect(cards.length).toBe(3);

    expect(screen.getByRole("heading", { level: 3, name: "Frontend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Backend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Database" })).toBeInTheDocument();

    expect(screen.queryByRole("heading", { level: 3, name: "Tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Deployment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Engineering" })).not.toBeInTheDocument();
  });

  it("category click swaps category into the showcase rather than adding more cards", () => {
    const { container } = render(<SkillsCapability skills={SIX_CATEGORY_SKILLS} />);
    expect(container.querySelectorAll("[data-category-card]").length).toBe(3);

    const toolsButton = screen.getByRole("button", { name: /Tools/i });
    fireEvent.click(toolsButton);

    // Still exactly 3 cards
    const cardsAfter = container.querySelectorAll("[data-category-card]");
    expect(cardsAfter.length).toBe(3);

    // Tools is now visible
    expect(screen.getByRole("heading", { level: 3, name: "Tools" })).toBeInTheDocument();
  });

  it("preserves real skills and technology names accurately from API data", () => {
    render(<SkillsCapability skills={SIX_CATEGORY_SKILLS} />);
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Django").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Redis").length).toBeGreaterThan(0);
  });

  it("handles empty and unavailable skill states honestly", () => {
    const { rerender } = render(<SkillsCapability skills={null} />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();

    rerender(<SkillsCapability skills={[]} />);
    expect(screen.getByText(/No published skills yet\./i)).toBeInTheDocument();
  });

  it("renders the same full skill list identically under prefers-reduced-motion", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      render(<SkillsCapability skills={SIX_CATEGORY_SKILLS} />);
      expect(screen.getByText("Core Stack")).toBeInTheDocument();
      expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Django").length).toBeGreaterThan(0);
      expect(screen.getAllByText("PostgreSQL").length).toBeGreaterThan(0);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

describe("tech-icons guard", () => {
  it("never references a remote icon CDN or external URL", () => {
    const source =
      Object.values(CategoryIcon)
        .map((c) => c.toString())
        .join("") + Object.values(CoreStackIcon).map((c) => c.toString()).join("");
    expect(source).not.toMatch(/https?:\/\//);
  });

  it("every category and Core Stack icon renders a real SVG element", () => {
    for (const Icon of [...Object.values(CategoryIcon), ...Object.values(CoreStackIcon)]) {
      const { container, unmount } = render(<Icon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      unmount();
    }
  });
});
