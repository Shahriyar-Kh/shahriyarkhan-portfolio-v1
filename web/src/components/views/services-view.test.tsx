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

import { ServicesView } from "@/components/views/services-view";
import type { Service } from "@/lib/api/types";

function makeService(overrides: Partial<Service>): Service {
  return {
    id: 1,
    title: "Sample Service",
    slug: "sample-service",
    description: "A sample service.",
    deliverables: [],
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
    ...overrides,
  };
}

describe("ServicesView", () => {
  it("renders every published service in a supplied list, all seven real services included", () => {
    const services = [
      "website-development",
      "restaurant-website",
      "ecommerce-website",
      "saas-project",
      "portfolio-website",
      "backend-development",
      "custom-web-application",
    ].map((slug, i) => makeService({ id: i + 1, slug, title: slug }));

    render(<ServicesView services={services} />);

    for (const service of services) {
      expect(screen.getByRole("link", { name: service.title })).toBeInTheDocument();
    }
  });

  it("renders an honest unavailable state for a failed fetch, not an empty grid", () => {
    render(<ServicesView services={null} />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders an honest empty state for a genuinely empty list", () => {
    render(<ServicesView services={[]} />);
    expect(screen.getByText(/No published services yet\./i)).toBeInTheDocument();
  });
});
