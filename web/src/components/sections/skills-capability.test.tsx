import { render, screen } from "@testing-library/react";
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
    category: { id: 1, name: "Frontend", slug: "frontend", display_order: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    published: true,
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("SkillsCapability", () => {
  it("announces each skill as 'name — level', not a bare numeric score", () => {
    render(<SkillsCapability skills={[makeSkill({ name: "React", level: 4 })]} />);
    expect(screen.getByLabelText("React — Expert")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*(years|yrs)/i)).not.toBeInTheDocument();
  });

  it("never labels every skill Expert - categorical levels reflect the real, varied backend data", () => {
    render(
      <SkillsCapability
        skills={[
          makeSkill({ id: 1, name: "Python", level: 4 }),
          makeSkill({ id: 2, name: "FastAPI", level: 2 }),
        ]}
      />,
    );
    expect(screen.getByLabelText("Python — Expert")).toBeInTheDocument();
    expect(screen.getByLabelText("FastAPI — Intermediate")).toBeInTheDocument();
  });

  /**
   * FINAL-DESIGN-01A-R4 §E: a Core Stack row highlights the verified
   * primary technologies, but only ones that actually exist in the
   * fetched data - never a hardcoded stack. "Django / DRF" is the real,
   * combined backend skill name (not two separate "Django" and "DRF"
   * skills), so it must appear once in the Core Stack row, matched by
   * keyword, not fabricated as two entries.
   */
  it("shows a Core Stack row built only from real, matched skills - never a fabricated one", () => {
    render(
      <SkillsCapability
        skills={[
          makeSkill({ id: 1, name: "Python", level: 4 }),
          makeSkill({ id: 2, name: "Django / DRF", level: 4 }),
          makeSkill({ id: 3, name: "Redis", level: 2 }),
        ]}
      />,
    );
    expect(screen.getByText("Core stack")).toBeInTheDocument();
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Django / DRF").length).toBeGreaterThan(0);
    // Redis matches no Core Stack keyword - it must not spawn a fabricated
    // "Redis" Core Stack slot, only its normal category-list row.
    expect(screen.getAllByText("Redis").length).toBe(1);
  });

  it("omits the Core Stack row entirely when no fetched skill matches a verified technology", () => {
    render(<SkillsCapability skills={[makeSkill({ id: 1, name: "Redis", level: 2 })]} />);
    expect(screen.queryByText("Core stack")).not.toBeInTheDocument();
  });

  it("keeps every skill name visible even though icons are decorative (aria-hidden)", () => {
    const { container } = render(<SkillsCapability skills={[makeSkill({ id: 1, name: "Redis", level: 2 })]} />);
    expect(screen.getByText("Redis")).toBeInTheDocument();
    // The icon is additive, not a replacement for the text name - it must
    // never be the only way the technology is identified.
    const icons = container.querySelectorAll('[aria-hidden="true"] svg');
    expect(icons.length).toBeGreaterThan(0);
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
      render(<SkillsCapability skills={[makeSkill({ name: "Django", level: 4 })]} />);
      expect(screen.getByLabelText("Django — Expert")).toBeInTheDocument();
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
