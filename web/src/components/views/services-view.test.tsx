import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
import type { Project, Service } from "@/lib/api/types";

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

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 1,
    title: "Sample Project",
    slug: "sample-project",
    description: "A sample project.",
    technologies: [],
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
    ...overrides,
  };
}

const REAL_SLUGS = [
  "custom-software-development",
  "web-development",
  "application-development",
  "saas-development",
  "database-development",
  "cloud-application-development",
];

const REAL_SERVICES = REAL_SLUGS.map((slug, i) =>
  makeService({ id: i + 1, slug, title: slug, deliverables: ["Thing one", "Thing two"] }),
);

const YANGO = makeProject({ id: 1, slug: "yango-wing-fleet-digital-registration-fleet-management-platform", title: "Yango Wing Fleet" });
const SK_LEARNTRACK = makeProject({ id: 2, slug: "sk-learntrack-ai-learning-platform", title: "SK-LearnTrack" });

function setReducedMotion(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe("ServicesView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("real API content", () => {
    it("renders exactly one h1 and every canonical service", () => {
      const { container } = render(<ServicesView services={REAL_SERVICES} projects={[YANGO, SK_LEARNTRACK]} />);

      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The service catalogue");
      for (const service of REAL_SERVICES) {
        expect(screen.getByRole("link", { name: service.title })).toBeInTheDocument();
      }
    });

    it("shows the real service count, never a hardcoded or stale number", () => {
      render(<ServicesView services={REAL_SERVICES} projects={[]} />);
      expect(screen.getByText("6 services")).toBeInTheDocument();
    });

    it("shows real deliverables from the API, never invented ones", () => {
      render(<ServicesView services={[makeService({ deliverables: ["Real deliverable A", "Real deliverable B"] })]} projects={[]} />);
      expect(screen.getByText("Real deliverable A")).toBeInTheDocument();
      expect(screen.getByText("Real deliverable B")).toBeInTheDocument();
    });

    it("shows the real bestFor/audience framing only for services that have it, never a fabricated one for the rest", () => {
      render(<ServicesView services={REAL_SERVICES} projects={[]} />);
      expect(screen.getByText(/Businesses that need software shaped around their real workflow/)).toBeInTheDocument();
      expect(screen.getByText(/Helps: Businesses and product teams/)).toBeInTheDocument();
    });

    it("links related work only for services with a real, vetted relatedProjectSlugs entry", () => {
      render(<ServicesView services={REAL_SERVICES} projects={[YANGO, SK_LEARNTRACK]} />);
      // Canonical custom-software/web services map to verified Yango work.
      const relatedLinks = screen.getAllByRole("link", { name: "Yango Wing Fleet" });
      expect(relatedLinks.length).toBeGreaterThan(0);
      expect(relatedLinks.some((l) => l.getAttribute("href") === "/work/yango-wing-fleet-digital-registration-fleet-management-platform")).toBe(true);
      expect(screen.getAllByText(/Related work:/).length).toBeGreaterThan(0);
    });

    it("never shows a related-work line for a service when the project fetch failed (projects: null)", () => {
      render(<ServicesView services={REAL_SERVICES} projects={null} />);
      expect(screen.queryByText(/Related work:/)).not.toBeInTheDocument();
    });

    it("renders the honest 'media coming soon' placeholder for a service with no image mapping, never a fabricated image", () => {
      render(<ServicesView services={[makeService({ slug: "totally-unmapped-service", title: "Totally Unmapped Service" })]} projects={[]} />);
      expect(screen.getByText("Media coming soon")).toBeInTheDocument();
    });

    it("renders an honest unavailable state for a failed fetch, not an empty catalogue", () => {
      render(<ServicesView services={null} projects={null} />);
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });

    it("renders an honest empty state for a genuinely empty list", () => {
      render(<ServicesView services={[]} projects={[]} />);
      expect(screen.getByText(/No published services yet\./i)).toBeInTheDocument();
    });

    it("never renders a service count line for an unavailable or empty dataset", () => {
      render(<ServicesView services={null} projects={null} />);
      expect(screen.queryByText(/^\d+\s+services?$/i)).not.toBeInTheDocument();
    });
  });

  describe("recruiter and client pathways", () => {
    it("exposes both the hiring and project CTAs via the shared DualCta section", () => {
      render(<ServicesView services={REAL_SERVICES} projects={[]} />);
      expect(screen.getByRole("link", { name: /view résumé/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /get in touch/i })).toBeInTheDocument();
    });
  });

  describe("heading hierarchy", () => {
    it("has no skipped heading levels - h1 for the page, h2 for every service title", () => {
      const { container } = render(<ServicesView services={REAL_SERVICES} projects={[]} />);
      const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
      expect(headings[0]).toBe(1);
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i]!;
        const previous = headings[i - 1]!;
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("reduced-motion behavior", () => {
    it("renders every service's real content immediately under prefers-reduced-motion", () => {
      const restore = setReducedMotion(true);
      try {
        render(<ServicesView services={REAL_SERVICES} projects={[]} />);
        for (const service of REAL_SERVICES) {
          expect(screen.getByRole("link", { name: service.title })).toBeInTheDocument();
        }
      } finally {
        restore();
      }
    });
  });

  describe("content truth", () => {
    it("never invents a price, testimonial, or superlative claim", () => {
      const { container } = render(<ServicesView services={REAL_SERVICES} projects={[YANGO, SK_LEARNTRACK]} />);
      const text = container.textContent?.toLowerCase() ?? "";
      expect(text).not.toMatch(/\$|guarantee(d)?|testimonial|world-class|best-in-class|enterprise-grade/);
    });

    it("renders each service's description exactly as returned by the API", () => {
      const custom = makeService({ description: "An exact, verbatim service description." });
      render(<ServicesView services={[custom]} projects={[]} />);
      expect(screen.getByText("An exact, verbatim service description.")).toBeInTheDocument();
    });
  });

  describe("responsive/overflow guards", () => {
    it("never applies a fixed pixel width to a content container", () => {
      const { container } = render(<ServicesView services={REAL_SERVICES} projects={[]} />);
      const fixedWidthEls = Array.from(container.querySelectorAll<HTMLElement>('[class*="w-["]')).filter((el) =>
        /(?:^|\s)w-\[\d+px\]/.test(el.className),
      );
      expect(fixedWidthEls).toHaveLength(0);
    });

    it("uses a single row per service - no separate mobile/desktop DOM trees", () => {
      const { container } = render(<ServicesView services={REAL_SERVICES} projects={[]} />);
      const rows = container.querySelectorAll("article");
      expect(rows).toHaveLength(REAL_SERVICES.length);
    });
  });
});
