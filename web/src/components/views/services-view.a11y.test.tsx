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

import { ServicesView } from "@/components/views/services-view";
import type { Service } from "@/lib/api/types";

const SERVICE: Service = {
  id: 1,
  title: "Custom Software Development",
  slug: "custom-software-development",
  description: "Custom software built around real business workflows, roles, integrations, and operational needs.",
  deliverables: ["Requirements and workflow analysis", "Backend/API architecture", "Authentication and permissions"],
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
 * contrast and focus order is still required.
 */
describe("ServicesView accessibility", () => {
  it("has no axe violations in its populated state", async () => {
    const { container } = render(<ServicesView services={[SERVICE]} projects={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its unavailable state", async () => {
    const { container } = render(<ServicesView services={null} projects={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its empty state", async () => {
    const { container } = render(<ServicesView services={[]} projects={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
