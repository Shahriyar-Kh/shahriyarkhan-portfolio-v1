import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { ContactView } from "@/components/views/contact-view";
import type { Service, SiteSettings } from "@/lib/api/types";

const SITE_SETTINGS: SiteSettings = {
  id: 1,
  site_name: "Shahriyar Khan",
  owner_name: "Shahriyar Khan",
  public_email: "real@example.com",
  public_phone: "+92 300 1234567",
  public_location: "Islamabad, Pakistan",
  notification_email: "",
  hero_title: "",
  hero_subtitle: "",
  default_seo_title: "",
  default_seo_description: "",
  default_keywords: "",
  footer_text: "",
  social_links: {},
  maintenance_mode: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const SERVICES: Service[] = [
  {
    id: 1,
    title: "Website Development",
    slug: "website-development",
    description: "",
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
  },
];

describe("ContactView accessibility", () => {
  it("has no axe violations with real contact details and services", async () => {
    const { container } = render(<ContactView services={SERVICES} siteSettings={SITE_SETTINGS} initialIntent="general" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations with a failed siteSettings/services fetch (fallback contact details)", async () => {
    const { container } = render(<ContactView services={null} siteSettings={null} initialIntent="general" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations for the project-intent path (service/budget/timeline fields rendered)", async () => {
    const { container } = render(<ContactView services={SERVICES} siteSettings={SITE_SETTINGS} initialIntent="freelance_project" initialServiceId="1" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
