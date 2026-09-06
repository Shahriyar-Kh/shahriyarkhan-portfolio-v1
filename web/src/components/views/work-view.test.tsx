import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import { WorkView } from "@/components/views/work-view";
import type { Project } from "@/lib/api/types";

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

const ALPHA = makeProject({
  id: 1,
  title: "Alpha",
  slug: "alpha",
  description: "Alpha does real backend work.",
  live_url: "https://alpha.example.com",
  github_url: "https://github.com/example/alpha",
  featured_image: "https://example.com/alpha.jpg",
  technologies: [{ id: 1, name: "Django", slug: "django" }, { id: 2, name: "PostgreSQL", slug: "postgresql" }],
});

const BETA = makeProject({
  id: 2,
  title: "Beta",
  slug: "beta",
  description: "Beta is a desktop build with no live demo.",
  live_url: "",
  github_url: "",
  technologies: [{ id: 3, name: "PyQt5", slug: "pyqt5" }],
});

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

describe("WorkView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("real API content", () => {
    it("renders exactly one h1 and every project's real title, description, and stack", () => {
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);

      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The project archive");
      expect(screen.getByRole("link", { name: "Alpha" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Beta" })).toBeInTheDocument();
      expect(screen.getByText("Alpha does real backend work.")).toBeInTheDocument();
      expect(screen.getByText("Django")).toBeInTheDocument();
      expect(screen.getByText("PyQt5")).toBeInTheDocument();
    });

    it("shows a real, live-derived Live/Case study status badge per project - never invented", () => {
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);
      // Badges are <span>s; "Case study"/"Live" also appear as link text
      // in each card's footer, so scope to the badge element specifically.
      const badges = Array.from(container.querySelectorAll("span")).map((el) => el.textContent);
      expect(badges).toContain("Live");
      expect(badges).toContain("Case study");
    });

    it("shows the Open source badge only for a genuinely distinct repository, not the shared profile URL", () => {
      const withProfileOnly = makeProject({ id: 3, title: "Gamma", slug: "gamma", github_url: "https://github.com/Shahriyar-Kh" });
      render(<WorkView projects={[ALPHA, withProfileOnly]} />);
      expect(screen.getAllByText("Open source")).toHaveLength(1);
    });

    it("shows the real project count, never a hardcoded or stale number", () => {
      render(<WorkView projects={[ALPHA, BETA]} />);
      expect(screen.getByText("2 published projects")).toBeInTheDocument();
    });

    it("links to the case study for every project, and to the live URL only when one exists", () => {
      render(<WorkView projects={[ALPHA, BETA]} />);
      const caseStudyLinks = screen.getAllByRole("link", { name: /case study/i });
      expect(caseStudyLinks.some((l) => l.getAttribute("href") === "/work/alpha")).toBe(true);
      expect(caseStudyLinks.some((l) => l.getAttribute("href") === "/work/beta")).toBe(true);

      const liveLinks = screen.getAllByRole("link", { name: /^live/i }).filter((l) => l.getAttribute("href") === ALPHA.live_url);
      expect(liveLinks).toHaveLength(1);
    });

    it("renders an honest unavailable state for a failed fetch (null), not an empty grid", () => {
      render(<WorkView projects={null} />);
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });

    it("renders an honest empty state for a genuinely empty list ([]), distinct from unavailable", () => {
      render(<WorkView projects={[]} />);
      expect(screen.getByText(/No published projects yet\./i)).toBeInTheDocument();
    });

    it("never renders a project count line for an unavailable or empty dataset", () => {
      render(<WorkView projects={null} />);
      expect(screen.queryByText(/^\d+\s+published projects?$/i)).not.toBeInTheDocument();
    });
  });

  describe("heading hierarchy", () => {
    it("has no skipped heading levels - h1 for the page, h2 for every project title", () => {
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);
      const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
      expect(headings[0]).toBe(1);
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i]!;
        const previous = headings[i - 1]!;
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("keyboard accessibility", () => {
    it("never nests an anchor inside another anchor (a real HTML-validity/keyboard trap risk for screenshot cards)", () => {
      // Alpha has a live_url and would use ProjectFrame's tall-screenshot
      // variant if a screenshot were registered for its slug; this
      // guards the general case for every project regardless of media
      // variant, since ArchiveCard never wraps ProjectFrame in a Link.
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);
      const anchors = Array.from(container.querySelectorAll("a"));
      for (const a of anchors) {
        expect(a.querySelector("a")).toBeNull();
      }
    });

    it("lets a keyboard user reach every project's case-study and live links via Tab", async () => {
      const user = userEvent.setup();
      render(<WorkView projects={[ALPHA]} />);
      const titleLink = screen.getByRole("link", { name: "Alpha" });
      titleLink.focus();
      expect(titleLink).toHaveFocus();

      await user.tab();
      const focused = document.activeElement;
      expect(focused?.tagName).toBe("A");
    });
  });

  describe("reduced-motion behavior", () => {
    it("renders every project's real content immediately under prefers-reduced-motion", () => {
      const restore = setReducedMotion(true);
      try {
        render(<WorkView projects={[ALPHA, BETA]} />);
        expect(screen.getByRole("link", { name: "Alpha" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Beta" })).toBeInTheDocument();
        expect(screen.getByText("Django")).toBeInTheDocument();
      } finally {
        restore();
      }
    });
  });

  describe("content truth", () => {
    it("never invents a price, testimonial, or superlative claim", () => {
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);
      const text = container.textContent?.toLowerCase() ?? "";
      expect(text).not.toMatch(/\$|guarantee(d)?|testimonial|world-class|best-in-class|enterprise-grade/);
    });

    it("renders each project's description exactly as returned by the API", () => {
      render(<WorkView projects={[ALPHA, BETA]} />);
      expect(screen.getByText(ALPHA.description)).toBeInTheDocument();
      expect(screen.getByText(BETA.description)).toBeInTheDocument();
    });
  });

  describe("responsive/overflow guards", () => {
    it("never applies a fixed pixel width to a content container", () => {
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);
      const fixedWidthEls = Array.from(container.querySelectorAll<HTMLElement>('[class*="w-["]')).filter((el) =>
        /(?:^|\s)w-\[\d+px\]/.test(el.className),
      );
      expect(fixedWidthEls).toHaveLength(0);
    });

    it("keeps every image inside an overflow-hidden frame", () => {
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);
      const images = container.querySelectorAll("img");
      expect(images.length).toBeGreaterThan(0);
      for (const img of Array.from(images)) {
        expect(img.closest('[class*="overflow-hidden"]')).not.toBeNull();
      }
    });

    it("uses a single grid for every breakpoint - no separate mobile/desktop DOM trees", () => {
      const { container } = render(<WorkView projects={[ALPHA, BETA]} />);
      const articles = container.querySelectorAll("article[data-archive-card]");
      // One <article> per real project, not two (one per breakpoint).
      expect(articles).toHaveLength(2);
    });
  });
});
