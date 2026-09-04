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

import { SkillsView } from "@/components/views/skills-view";
import type { Skill } from "@/lib/api/types";

function makeSkill(overrides: Partial<Skill> & { category: Skill["category"] }): Skill {
  return {
    id: 1,
    name: "Sample Skill",
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

const BACKEND = { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" };
const FRONTEND = { id: 2, name: "Frontend", slug: "frontend", display_order: 2, created_at: "", updated_at: "" };

describe("SkillsView", () => {
  it("renders every supplied skill category, not just one", () => {
    const skills = [
      makeSkill({ id: 1, name: "Python", level: 4, category: BACKEND }),
      makeSkill({ id: 2, name: "Django / DRF", level: 4, category: BACKEND }),
      makeSkill({ id: 3, name: "React.js", level: 3, category: FRONTEND }),
    ];

    render(<SkillsView skills={skills} />);

    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("React.js")).toBeInTheDocument();
  });

  it("uses categorical level labels, never a fabricated percentage", () => {
    const skills = [
      makeSkill({ id: 1, name: "Python", level: 4, category: BACKEND }),
      makeSkill({ id: 2, name: "Docker", level: 2, category: BACKEND }),
    ];

    render(<SkillsView skills={skills} />);

    expect(screen.getByText("Expert")).toBeInTheDocument();
    expect(screen.getByText("Intermediate")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("renders an honest unavailable state for a failed fetch", () => {
    render(<SkillsView skills={null} />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders an honest empty state for a genuinely empty list", () => {
    render(<SkillsView skills={[]} />);
    expect(screen.getByText(/No published skills yet\./i)).toBeInTheDocument();
  });
});
