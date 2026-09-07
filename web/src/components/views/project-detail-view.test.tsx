import { render, screen, within } from "@testing-library/react";
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

import { ProjectDetailView, ProjectUnavailableView } from "@/components/views/project-detail-view";
import type { CaseStudy } from "@/content/case-studies/types";
import type { Project, ProjectWithOptionalCaseStudy } from "@/lib/api/types";

function makeProject(overrides: Partial<Project>): ProjectWithOptionalCaseStudy {
  return {
    id: 1,
    title: "Test Project",
    slug: "test-project",
    description: "A test project.",
    technologies: [{ id: 1, name: "Django", slug: "django" }],
    live_url: "https://example.com",
    github_url: "https://github.com/Shahriyar-Kh",
    preview_image: null,
    featured_image: null,
    alt_text: "",
    ai_summary: "A short summary.",
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

const PROJECT = makeProject({ featured_image: "https://example.com/shot.jpg" });

const CASE_STUDY: CaseStudy = {
  slug: "test-project",
  summary: "A case study summary.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [
        { id: "a", statement: "A verified architectural fact.", status: "verified", evidence: "e" },
        { id: "b", statement: "A conservatively stated fact.", status: "inferred", evidence: "e2" },
      ],
    },
  ],
  evidence: [{ kind: "live", label: "example.com", href: "https://example.com", verifiedOn: "2026-01-01" }],
  withheld: [],
  limitations: ["This page does not claim X."],
  lastReviewed: "2026-01-01",
  projectContext: "client",
};

const SIBLING = makeProject({ id: 2, title: "Sibling Project", slug: "sibling-project" });
const THIRD = makeProject({ id: 3, title: "Third Project", slug: "third-project" });

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

describe("ProjectDetailView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("real content", () => {
    it("renders the project hero and the register's case sections when a case study exists", () => {
      render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={[PROJECT, SIBLING]} />);

      expect(screen.getByRole("heading", { level: 1, name: "Test Project" })).toBeInTheDocument();
      expect(screen.getByText("Architecture")).toBeInTheDocument();
      expect(screen.getByText("A verified architectural fact.")).toBeInTheDocument();
      expect(screen.getByText("A conservatively stated fact.")).toBeInTheDocument();
      expect(screen.getByText("This page does not claim X.")).toBeInTheDocument();
    });

    it("shows real, derived status/type/repo badges - never an invented claim", () => {
      const withDistinctRepo = makeProject({ github_url: "https://github.com/example/test-project", featured_image: "https://example.com/shot.jpg" });
      render(<ProjectDetailView project={withDistinctRepo} caseStudy={CASE_STUDY} allProjects={null} />);
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByText("Client project")).toBeInTheDocument();
      expect(screen.getByText("Open source")).toBeInTheDocument();
    });

    it("never shows the Client project badge unless the register explicitly says so", () => {
      const noClientStudy: CaseStudy = { ...CASE_STUDY, projectContext: undefined };
      render(<ProjectDetailView project={PROJECT} caseStudy={noClientStudy} allProjects={null} />);
      expect(screen.queryByText("Client project")).not.toBeInTheDocument();
    });

    it("shows a Case study badge (not Live) when the project has no live_url", () => {
      const offline = makeProject({ live_url: "" });
      render(<ProjectDetailView project={offline} caseStudy={null} allProjects={null} />);
      expect(screen.getByText("Case study")).toBeInTheDocument();
      expect(screen.queryByText("Live")).not.toBeInTheDocument();
    });

    it("renders a visible breadcrumb naming Home, Work, and the current project", () => {
      render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={null} />);
      const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
      expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
      expect(within(nav).getByRole("link", { name: "Work" })).toHaveAttribute("href", "/work");
      expect(within(nav).getByText("Test Project")).toBeInTheDocument();
    });

    it("renders an honest 'not yet published' notice when no case study and no API case fields exist", () => {
      render(<ProjectDetailView project={PROJECT} caseStudy={null} allProjects={null} />);

      expect(screen.getByRole("heading", { level: 1, name: "Test Project" })).toBeInTheDocument();
      expect(screen.getByText(/not yet published/i)).toBeInTheDocument();
    });

    it("renders previous/next navigation only when a real sibling project list is available", () => {
      const { rerender } = render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={[PROJECT, SIBLING, THIRD]} />);
      const nav = screen.getByRole("navigation", { name: /more projects/i });
      expect(within(nav).getByRole("link", { name: /Third Project/i })).toHaveAttribute("href", "/work/third-project");
      expect(within(nav).getByRole("link", { name: /Sibling Project/i })).toHaveAttribute("href", "/work/sibling-project");

      rerender(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={null} />);
      expect(screen.queryByRole("navigation", { name: /more projects/i })).not.toBeInTheDocument();
    });
  });

  describe("heading hierarchy", () => {
    it("has exactly one h1 and no skipped heading levels", () => {
      const { container } = render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={[PROJECT, SIBLING]} />);
      const h1s = container.querySelectorAll("h1");
      expect(h1s).toHaveLength(1);

      const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
      expect(headings[0]).toBe(1);
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i]!;
        const previous = headings[i - 1]!;
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("keyboard-accessible gallery", () => {
    it("opens the full-size view on click, closes on Escape, and returns focus to the trigger", async () => {
      const user = userEvent.setup();
      render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={null} />);

      const trigger = screen.getByRole("button", { name: /view full size/i });
      await user.click(trigger);
      expect(screen.getByRole("dialog", { name: /full size/i })).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it("closes via the explicit close button too", async () => {
      const user = userEvent.setup();
      render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={null} />);
      await user.click(screen.getByRole("button", { name: /view full size/i }));
      await user.click(screen.getByRole("button", { name: /close full-size view/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("never offers a full-size view for a project with no real image (the honest placeholder has nothing to zoom into)", () => {
      const noMedia = makeProject({ live_url: "", featured_image: null, preview_image: null });
      render(<ProjectDetailView project={noMedia} caseStudy={null} allProjects={null} />);
      expect(screen.queryByRole("button", { name: /view full size/i })).not.toBeInTheDocument();
    });
  });

  describe("reduced-motion behavior", () => {
    it("renders full real content immediately under prefers-reduced-motion", () => {
      const restore = setReducedMotion(true);
      try {
        render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={[PROJECT, SIBLING]} />);
        expect(screen.getByRole("heading", { level: 1, name: "Test Project" })).toBeInTheDocument();
        expect(screen.getByText("A verified architectural fact.")).toBeInTheDocument();
      } finally {
        restore();
      }
    });
  });

  describe("links", () => {
    it("opens the live URL in a new tab with safe rel attributes", () => {
      render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={null} />);
      const liveLink = screen.getByRole("link", { name: "View live" });
      expect(liveLink).toHaveAttribute("href", "https://example.com");
      expect(liveLink).toHaveAttribute("target", "_blank");
      expect(liveLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });

    it("shows an honest 'no public repository' note instead of a broken/fake link when github_url is absent", () => {
      const noRepo = makeProject({ github_url: "" });
      render(<ProjectDetailView project={noRepo} caseStudy={null} allProjects={null} />);
      expect(screen.getByText("No public repository")).toBeInTheDocument();
    });
  });

  describe("content truth", () => {
    it("never renders a fabricated superlative or credential", () => {
      const { container } = render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={[PROJECT, SIBLING]} />);
      const text = container.textContent?.toLowerCase() ?? "";
      for (const term of ["enterprise-grade", "production-grade", "senior software engineer", "world-class", "best-in-class", "trusted by"]) {
        expect(text).not.toContain(term);
      }
    });

    it("renders every claim statement verbatim, exactly as authored in the register", () => {
      render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={null} />);
      for (const section of CASE_STUDY.sections) {
        for (const claim of section.claims) {
          expect(screen.getByText(claim.statement)).toBeInTheDocument();
        }
      }
    });
  });

  describe("responsive/overflow guards", () => {
    it("never applies a fixed pixel width to a content container", () => {
      const { container } = render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={[PROJECT, SIBLING]} />);
      const fixedWidthEls = Array.from(container.querySelectorAll<HTMLElement>('[class*="w-["]')).filter((el) =>
        /(?:^|\s)w-\[\d+px\]/.test(el.className),
      );
      expect(fixedWidthEls).toHaveLength(0);
    });
  });
});

describe("ProjectUnavailableView", () => {
  it("renders the given message for a transient fetch failure", () => {
    render(<ProjectUnavailableView message="Could not reach the content service." />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("Could not reach the content service.")).toBeInTheDocument();
  });
});
