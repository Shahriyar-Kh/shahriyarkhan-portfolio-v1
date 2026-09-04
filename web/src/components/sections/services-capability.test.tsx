import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
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
  default: ({ alt, priority, sizes, ...rest }: { src: string; alt: string; priority?: boolean; sizes?: string }) => (
    <img alt={alt} data-priority={priority ? "true" : "false"} data-sizes={sizes} {...rest} />
  ),
}));

import { ServicesCapability } from "@/components/sections/services-capability";
import { SERVICES_MEDIA } from "@/content/services-media";
import type { Service } from "@/lib/api/types";

const REAL_SLUGS = [
  "website-development",
  "restaurant-website",
  "ecommerce-website",
  "saas-project",
  "portfolio-website",
  "backend-development",
  "custom-web-application",
];

const WEB_ROOT = join(__dirname, "../../..");
const PUBLIC_SERVICES_DIR = join(WEB_ROOT, "public", "images", "services");

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

const ALL_REAL_SERVICES = REAL_SLUGS.map((slug, i) => makeService({ id: i + 1, slug, title: slug }));

describe("SERVICES_MEDIA data integrity", () => {
  it("maps every real service slug to a local raster image", () => {
    for (const slug of REAL_SLUGS) {
      const entry = SERVICES_MEDIA[slug];
      expect(entry, `missing SERVICES_MEDIA entry for ${slug}`).toBeDefined();
      expect(entry!.image.file).toMatch(/^\/images\/services\/[a-z0-9-]+\.webp$/);
    }
  });

  // FINAL-DESIGN-01A-R6-FIX: this round touched only the data-fetching
  // layer, never services-media.ts - this regression guard confirms the
  // R6 real-image mapping is exactly what it was, not silently narrowed
  // or expanded.
  it("keeps the R6 mapping at exactly the seven real service slugs, no more and no fewer", () => {
    expect(Object.keys(SERVICES_MEDIA).sort()).toEqual([...REAL_SLUGS].sort());
  });

  it("never references a remote host - every image path is a local /public path", () => {
    for (const entry of Object.values(SERVICES_MEDIA)) {
      expect(entry.image.file).not.toMatch(/https?:\/\//);
      expect(entry.image.file.startsWith("/images/services/")).toBe(true);
    }
  });

  it("every mapped image file actually exists on disk", () => {
    for (const entry of Object.values(SERVICES_MEDIA)) {
      const diskPath = join(WEB_ROOT, "public", entry.image.file);
      expect(existsSync(diskPath), `${entry.image.file} does not exist on disk`).toBe(true);
    }
  });

  it("distinguishes owned project/portfolio evidence from illustrative stock photography", () => {
    const kinds = new Set(Object.values(SERVICES_MEDIA).map((e) => e.image.kind));
    expect(kinds).toEqual(new Set(["owned", "illustrative"]));
    // The three real-project/portfolio slugs must be "owned"; the three
    // stock-photo slugs must be "illustrative" - not guessed either way.
    expect(SERVICES_MEDIA["website-development"]!.image.kind).toBe("owned");
    expect(SERVICES_MEDIA["saas-project"]!.image.kind).toBe("owned");
    expect(SERVICES_MEDIA["custom-web-application"]!.image.kind).toBe("owned");
    expect(SERVICES_MEDIA["portfolio-website"]!.image.kind).toBe("owned");
    expect(SERVICES_MEDIA["restaurant-website"]!.image.kind).toBe("illustrative");
    expect(SERVICES_MEDIA["ecommerce-website"]!.image.kind).toBe("illustrative");
    expect(SERVICES_MEDIA["backend-development"]!.image.kind).toBe("illustrative");
  });

  it("gives every image a real, non-empty alt description", () => {
    for (const entry of Object.values(SERVICES_MEDIA)) {
      expect(entry.image.alt.length).toBeGreaterThan(10);
    }
  });

  it("never invents prices, timelines, guarantees, client counts, or completed-project claims in the expanded copy", () => {
    const prohibited = /\$|guarantee(d)?|delivered in|\d+\s*(days|weeks|years)\s*(of experience)?|per hour|per month|award|testimonial|conversion rate|\d+%/i;
    for (const [slug, entry] of Object.entries(SERVICES_MEDIA)) {
      expect(entry.bestFor, `${slug} bestFor`).not.toMatch(prohibited);
      expect(entry.scope, `${slug} scope`).not.toMatch(prohibited);
    }
  });

  it("every SOURCES.md-documented licensed image has a matching illustrative entry", () => {
    const sources = readFileSync(join(PUBLIC_SERVICES_DIR, "SOURCES.md"), "utf8");
    const illustrative = Object.values(SERVICES_MEDIA).filter((e) => e.image.kind === "illustrative");
    for (const entry of illustrative) {
      const filename = entry.image.file.split("/").pop()!;
      expect(sources, `${filename} not documented in SOURCES.md`).toContain(filename);
    }
  });
});

describe("ServicesCapability", () => {
  it("renders every real service (API-sourced titles, not hardcoded) with real local media", () => {
    const { container } = render(<ServicesCapability services={ALL_REAL_SERVICES} />);
    for (const service of ALL_REAL_SERVICES) {
      expect(screen.getByRole("link", { name: service.title })).toBeInTheDocument();
    }
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(ALL_REAL_SERVICES.length);
    for (const img of Array.from(images)) {
      expect(img.getAttribute("src")).toMatch(/^\/images\/services\//);
    }
  });

  it("never uses the old SVG scene renderer - no inline <svg> scene anywhere in the section", () => {
    const { container } = render(<ServicesCapability services={ALL_REAL_SERVICES} />);
    expect(container.querySelectorAll("[data-service-scene]").length).toBe(0);
    expect(container.querySelectorAll("svg").length).toBe(0);
  });

  it("never sets priority on a service image - every service card is below the fold", () => {
    const { container } = render(<ServicesCapability services={ALL_REAL_SERVICES} />);
    for (const img of Array.from(container.querySelectorAll("img"))) {
      expect(img.getAttribute("data-priority")).toBe("false");
    }
  });

  it("gives every service image a real sizes attribute (never left to the browser default)", () => {
    const { container } = render(<ServicesCapability services={ALL_REAL_SERVICES} />);
    for (const img of Array.from(container.querySelectorAll("img"))) {
      expect(img.getAttribute("data-sizes")).toBeTruthy();
    }
  });

  it("renders an honest unavailable state for a failed fetch, not an empty grid", () => {
    render(<ServicesCapability services={null} />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders an honest empty state for a genuinely empty list", () => {
    render(<ServicesCapability services={[]} />);
    expect(screen.getByText(/No published services yet\./i)).toBeInTheDocument();
  });

  it("gives an unexpected/unmapped service slug an honest non-image fallback, never a guessed photo", () => {
    render(<ServicesCapability services={[makeService({ id: 1, slug: "graphic-design-consulting", title: "Graphic Design Consulting" })]} />);
    expect(screen.getByText(/media coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // Still an honest, real service card - title and description present.
    expect(screen.getByRole("link", { name: "Graphic Design Consulting" })).toBeInTheDocument();
  });

  it("keeps the featured service's request/detail links pointed at the correct contact intent and route", () => {
    render(<ServicesCapability services={[makeService({ id: 1, slug: "website-development", title: "Website Development" })]} />);
    const request = screen.getByRole("link", { name: "Request this service" });
    expect(request).toHaveAttribute("href", "/contact?intent=freelance_project");
    expect(request).toHaveAttribute("data-analytics-event", "project_cta_click");
    expect(screen.getByRole("link", { name: "Website Development" })).toHaveAttribute("href", "/services/website-development");
  });

  it("keeps every supporting service's Details and Request links pointed correctly", () => {
    render(<ServicesCapability services={ALL_REAL_SERVICES} />);
    for (const slug of REAL_SLUGS.slice(1)) {
      const detailsLinks = screen.getAllByRole("link", { name: "Details" });
      expect(detailsLinks.some((l) => l.getAttribute("href") === `/services/${slug}`)).toBe(true);
    }
    const requestLinks = screen.getAllByRole("link", { name: "Request" });
    expect(requestLinks.length).toBe(REAL_SLUGS.length - 1);
    for (const link of requestLinks) {
      expect(link).toHaveAttribute("href", "/contact?intent=freelance_project");
    }
  });

  it("never invents pricing, delivery time, or guarantees anywhere in the rendered section", () => {
    render(<ServicesCapability services={ALL_REAL_SERVICES} />);
    expect(screen.queryByText(/\$|per hour|per month|guarantee(d)?|delivered in|\d+\s*(days|weeks)/i)).not.toBeInTheDocument();
  });

  it("keeps the same content and every image present under prefers-reduced-motion", () => {
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
      const { container } = render(<ServicesCapability services={ALL_REAL_SERVICES} />);
      for (const service of ALL_REAL_SERVICES) {
        expect(screen.getByRole("link", { name: service.title })).toBeInTheDocument();
      }
      expect(container.querySelectorAll("img").length).toBe(ALL_REAL_SERVICES.length);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

/**
 * axe-in-jsdom cannot evaluate color contrast or true focus order (no
 * layout engine) - this catches structural issues only (missing
 * labels/roles, invalid ARIA, heading order). Manual verification of
 * contrast/focus order is documented in the R6 audit report.
 */
describe("ServicesCapability accessibility", () => {
  it("has no axe violations with a full populated card set", async () => {
    const { container } = render(<ServicesCapability services={ALL_REAL_SERVICES} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its unavailable state", async () => {
    const { container } = render(<ServicesCapability services={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
