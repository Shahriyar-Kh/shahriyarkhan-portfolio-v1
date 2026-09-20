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

import { ServiceDetailView, ServiceUnavailableView } from "@/components/views/service-detail-view";
import { ENGAGEMENT_STEPS, SERVICE_FRAMING } from "@/content/services";
import { SERVICES_MEDIA } from "@/content/services-media";
import type { Service } from "@/lib/api/types";

const SERVICE: Service = {
  id: 6,
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

describe("ServiceDetailView accessibility", () => {
  it("has no axe violations with a full framing/media/related-work state", async () => {
    const { container } = render(
      <ServiceDetailView
        service={SERVICE}
        framing={SERVICE_FRAMING[SERVICE.slug]}
        media={SERVICES_MEDIA[SERVICE.slug]}
        engagementSteps={ENGAGEMENT_STEPS}
        relatedProjects={[{ slug: "yango-wing-fleet-digital-registration-fleet-management-platform", title: "Yango Wing Fleet" }]}
        allServices={[SERVICE]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the reduced/no-framing, no-related-work state", async () => {
    const { container } = render(
      <ServiceDetailView
        service={SERVICE}
        framing={undefined}
        media={undefined}
        engagementSteps={ENGAGEMENT_STEPS}
        relatedProjects={[]}
        allServices={null}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the unavailable state", async () => {
    const { container } = render(<ServiceUnavailableView message="Please try again shortly." />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
