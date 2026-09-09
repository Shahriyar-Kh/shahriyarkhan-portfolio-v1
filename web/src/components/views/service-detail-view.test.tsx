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

import { ServiceDetailView, ServiceUnavailableView } from "@/components/views/service-detail-view";
import { ENGAGEMENT_STEPS, SERVICE_FRAMING } from "@/content/services";
import { SERVICES_MEDIA } from "@/content/services-media";
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

const BACKEND = makeService({
  id: 6,
  slug: "backend-development",
  title: "Backend Development",
  description: "Robust APIs, database architecture, and server-side logic using Django and FastAPI.",
  deliverables: ["REST API", "Database modeling", "Authentication and permissions"],
});

const RESTAURANT = makeService({
  id: 2,
  slug: "restaurant-website",
  title: "Restaurant Website",
  description: "Beautiful restaurant websites with menus, reservations, and online ordering.",
  deliverables: ["Digital menu", "Reservation flow"],
});

const OTHER = makeService({ id: 3, slug: "ecommerce-website", title: "Ecommerce Website" });

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

describe("ServiceDetailView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("real API content", () => {
    it("renders exactly one h1 with the real service title and description", () => {
      const { container } = render(
        <ServiceDetailView
          service={BACKEND}
          framing={SERVICE_FRAMING[BACKEND.slug]}
          media={SERVICES_MEDIA[BACKEND.slug]}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Backend Development");
      expect(screen.getByText(BACKEND.description)).toBeInTheDocument();
    });

    it("renders real deliverables from the API, never invented ones", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={undefined}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      expect(screen.getByText("REST API")).toBeInTheDocument();
      expect(screen.getByText("Database modeling")).toBeInTheDocument();
    });

    it("shows framing-gated sections (problem, audience, needed-to-begin) only when a real SERVICE_FRAMING entry exists", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={SERVICE_FRAMING[BACKEND.slug]}
          media={SERVICES_MEDIA[BACKEND.slug]}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      expect(screen.getByText("The problem this solves")).toBeInTheDocument();
      expect(screen.getByText(SERVICE_FRAMING[BACKEND.slug]!.problemFraming)).toBeInTheDocument();
      expect(screen.getByText("What's needed to begin")).toBeInTheDocument();
    });

    it("never fabricates a framing section for a service with no SERVICE_FRAMING entry", () => {
      render(
        <ServiceDetailView
          service={RESTAURANT}
          framing={SERVICE_FRAMING[RESTAURANT.slug]}
          media={SERVICES_MEDIA[RESTAURANT.slug]}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      expect(SERVICE_FRAMING[RESTAURANT.slug]).toBeUndefined();
      expect(screen.queryByText("The problem this solves")).not.toBeInTheDocument();
      expect(screen.queryByText("What's needed to begin")).not.toBeInTheDocument();
      // The real bestFor framing (from SERVICES_MEDIA, which covers all 7) still renders.
      expect(screen.getByText(/Best for restaurants and caf/)).toBeInTheDocument();
    });

    it("shows real technology tags only from SERVICES_MEDIA, never invented technologies", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={undefined}
          media={SERVICES_MEDIA[BACKEND.slug]}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      for (const tag of SERVICES_MEDIA[BACKEND.slug]!.techTags) {
        expect(screen.getByText(tag)).toBeInTheDocument();
      }
    });

    it("renders the honest 'media coming soon' placeholder when no image mapping exists, never a fabricated image", () => {
      const unmapped = makeService({ slug: "totally-unmapped" });
      render(
        <ServiceDetailView
          service={unmapped}
          framing={undefined}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      expect(screen.getByText("Media coming soon")).toBeInTheDocument();
    });

    it("renders all seven engagement steps in order", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={undefined}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      for (const step of ENGAGEMENT_STEPS) {
        expect(screen.getByText(step)).toBeInTheDocument();
      }
    });

    it("links related work only for real, vetted project mappings", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={SERVICE_FRAMING[BACKEND.slug]}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[{ slug: "yango-wing-fleet-digital-registration-fleet-management-platform", title: "Yango Wing Fleet" }]}
          allServices={null}
        />,
      );
      const link = screen.getByRole("link", { name: "Yango Wing Fleet" });
      expect(link).toHaveAttribute("href", "/work/yango-wing-fleet-digital-registration-fleet-management-platform");
    });

    it("uses an honest CTA instead of an empty showcase for a service with no related work, never a misleading placeholder", () => {
      render(
        <ServiceDetailView
          service={RESTAURANT}
          framing={undefined}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      expect(screen.getByText(/no published project directly demonstrates/i)).toBeInTheDocument();
      const cta = screen.getByRole("link", { name: /discuss what you're building/i });
      expect(cta).toHaveAttribute("href", expect.stringContaining("/contact?intent=freelance_project"));
    });

    it("builds the enquiry CTA href from the real service id", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={undefined}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      const cta = screen.getByRole("link", { name: "Request this service" });
      expect(cta).toHaveAttribute("href", `/contact?intent=freelance_project&service=${BACKEND.id}`);
    });
  });

  describe("previous/next navigation", () => {
    it("shows prev/next links across the real service order when the sibling list is available", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={undefined}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={[RESTAURANT, BACKEND, OTHER]}
        />,
      );
      expect(screen.getByRole("navigation", { name: /more services/i })).toBeInTheDocument();
      expect(screen.getByText(RESTAURANT.title)).toBeInTheDocument();
      expect(screen.getByText(OTHER.title)).toBeInTheDocument();
    });

    it("never renders prev/next when the sibling list fetch failed", () => {
      render(
        <ServiceDetailView
          service={BACKEND}
          framing={undefined}
          media={undefined}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      expect(screen.queryByRole("navigation", { name: /more services/i })).not.toBeInTheDocument();
    });
  });

  describe("unavailable state", () => {
    it("uses services-neutral wording, not a project-flavored message", () => {
      render(<ServiceUnavailableView message="Please try again shortly." />);
      expect(screen.getByText(/this service's details are temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.queryByText(/this project's details/i)).not.toBeInTheDocument();
    });
  });

  describe("heading hierarchy", () => {
    it("has no skipped heading levels", () => {
      const { container } = render(
        <ServiceDetailView
          service={BACKEND}
          framing={SERVICE_FRAMING[BACKEND.slug]}
          media={SERVICES_MEDIA[BACKEND.slug]}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
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
    it("renders all real content immediately under prefers-reduced-motion", () => {
      const restore = setReducedMotion(true);
      try {
        render(
          <ServiceDetailView
            service={BACKEND}
            framing={SERVICE_FRAMING[BACKEND.slug]}
            media={SERVICES_MEDIA[BACKEND.slug]}
            engagementSteps={ENGAGEMENT_STEPS}
            relatedProjects={[]}
            allServices={null}
          />,
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Backend Development");
        expect(screen.getByText("REST API")).toBeInTheDocument();
      } finally {
        restore();
      }
    });
  });

  describe("content truth", () => {
    it("never invents a price, testimonial, or superlative claim", () => {
      const { container } = render(
        <ServiceDetailView
          service={BACKEND}
          framing={SERVICE_FRAMING[BACKEND.slug]}
          media={SERVICES_MEDIA[BACKEND.slug]}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      const text = container.textContent?.toLowerCase() ?? "";
      expect(text).not.toMatch(/\$|guarantee(d)?|testimonial|world-class|best-in-class|enterprise-grade/);
    });
  });

  describe("responsive/overflow guards", () => {
    it("never applies a fixed pixel width to a content container", () => {
      const { container } = render(
        <ServiceDetailView
          service={BACKEND}
          framing={SERVICE_FRAMING[BACKEND.slug]}
          media={SERVICES_MEDIA[BACKEND.slug]}
          engagementSteps={ENGAGEMENT_STEPS}
          relatedProjects={[]}
          allServices={null}
        />,
      );
      const fixedWidthEls = Array.from(container.querySelectorAll<HTMLElement>('[class*="w-["]')).filter((el) =>
        /(?:^|\s)w-\[\d+px\]/.test(el.className),
      );
      expect(fixedWidthEls).toHaveLength(0);
    });
  });
});
