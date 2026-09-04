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
vi.mock("next/image", () => ({
  default: ({ alt, ...rest }: { src: string; alt: string }) => <img alt={alt} {...rest} />,
}));

import { WorkView } from "@/components/views/work-view";
import type { Project } from "@/lib/api/types";

const PROJECT: Project = {
  id: 1,
  title: "Accessible Project",
  slug: "accessible-project",
  description: "A project used to check for obvious a11y regressions.",
  technologies: [{ id: 1, name: "Django", slug: "django" }],
  live_url: "https://example.com",
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
};

/**
 * axe-in-jsdom cannot evaluate color contrast or true focus order (no
 * layout engine) - this catches structural issues only (missing
 * labels/roles, invalid ARIA, heading order). Manual verification of
 * contrast and focus order is still required - see
 * docs/rebuild/P01_IMPLEMENTATION_REPORT.md.
 */
describe("WorkView accessibility", () => {
  it("has no axe violations in its populated state", async () => {
    const { container } = render(<WorkView projects={[PROJECT]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its unavailable state", async () => {
    const { container } = render(<WorkView projects={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
