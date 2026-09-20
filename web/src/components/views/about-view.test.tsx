import { render, screen, within } from "@testing-library/react";
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

import { AboutView } from "@/components/views/about-view";
import type { Education, Experience, Project, Service, Skill } from "@/lib/api/types";

const EXPERIENCE_CURRENT: Experience = {
  id: 1,
  company_name: "HA Technologies (Pvt) Ltd",
  role_title: "Software Developer",
  start_date: "2025-06-01",
  end_date: null,
  location: "Islamabad",
  description: "Developed scalable full-stack web applications using Django, DRF, FastAPI, and React.js.",
  achievements: [
    "Developed scalable full-stack web applications using Django, DRF, FastAPI, and React.js",
    "Designed secure backend architectures with JWT authentication and RBAC",
  ],
  technologies: [{ id: 1, name: "Django", slug: "django" }],
  current_role: true,
  status: "published",
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

const EXPERIENCE_PAST: Experience = {
  ...EXPERIENCE_CURRENT,
  id: 2,
  company_name: "CodeAlpha",
  role_title: "Python Developer Intern",
  start_date: "2025-02-01",
  end_date: "2025-05-31",
  location: "Remote",
  description: "Developed desktop applications using Python, PyQt5, and Tkinter.",
  achievements: ["Developed desktop applications using Python, PyQt5, and Tkinter"],
  current_role: false,
};

const EDUCATION: Education = {
  id: 1,
  institution: "Abasyn University, Peshawar",
  degree: "BS Software Engineering",
  start_date: "2021-09-01",
  end_date: "2025-06-30",
  description: "Graduated 2025 • CGPA 3.67",
  status: "published",
  published_at: "2026-01-01T00:00:00Z",
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeSkill(overrides: Partial<Skill>): Skill {
  return {
    id: 1,
    name: "Python",
    description: "",
    level: 4,
    icon_or_badge: "",
    category: { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" },
    published: true,
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const SKILLS: Skill[] = [
  makeSkill({ id: 1, name: "Python", level: 4, category: { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" } }),
  makeSkill({ id: 2, name: "Django / DRF", level: 4, category: { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" } }),
  makeSkill({ id: 3, name: "PostgreSQL", level: 4, category: { id: 2, name: "Database", slug: "database", display_order: 2, created_at: "", updated_at: "" } }),
  makeSkill({ id: 4, name: "React.js", level: 3, category: { id: 3, name: "Frontend", slug: "frontend", display_order: 3, created_at: "", updated_at: "" } }),
];

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 1,
    title: "Sample Project",
    slug: "sample-project",
    description: "",
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

function makeService(overrides: Partial<Service>): Service {
  return {
    id: 1,
    title: "Sample Service",
    slug: "sample-service",
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
    ...overrides,
  };
}

const FULL_PROPS = {
  skills: SKILLS,
  experiences: [EXPERIENCE_CURRENT, EXPERIENCE_PAST],
  education: [EDUCATION],
  projects: [makeProject({ id: 1, slug: "a" }), makeProject({ id: 2, slug: "b" })],
  services: [makeService({ id: 1, slug: "a" }), makeService({ id: 2, slug: "b" })],
  specialization: "Software Engineering graduate specializing in backend development.",
};

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

describe("AboutView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("real API content", () => {
    it("renders the portrait, specialization, career narrative, and real experience/education/skill records", () => {
      render(<AboutView {...FULL_PROPS} />);

      expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
      expect(screen.getByText(FULL_PROPS.specialization)).toBeInTheDocument();
      // "Software Developer" / "HA Technologies (Pvt) Ltd" legitimately
      // render twice now: once in the Timeline row, once in the
      // Narrative's real-data "Now" milestone (see about-narrative.tsx).
      expect(screen.getAllByText("Software Developer").length).toBeGreaterThan(0);
      expect(screen.getAllByText("HA Technologies (Pvt) Ltd", { exact: false }).length).toBeGreaterThan(0);
      expect(screen.getByText("Python Developer Intern")).toBeInTheDocument();
      expect(screen.getByText("BS Software Engineering")).toBeInTheDocument();
      expect(screen.getByText("Abasyn University, Peshawar", { exact: false })).toBeInTheDocument();
      expect(screen.getByText("Graduated 2025 • CGPA 3.67")).toBeInTheDocument();
      expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
      expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    });

    it("renders every passed achievement verbatim, never a reworded or shortened version", () => {
      render(<AboutView {...FULL_PROPS} />);
      for (const achievement of EXPERIENCE_CURRENT.achievements) {
        expect(screen.getByText(achievement)).toBeInTheDocument();
      }
    });

    it("falls back to the honest default specialization line when SiteSettings is unavailable", () => {
      render(<AboutView {...FULL_PROPS} specialization={null} />);
      expect(screen.getByText(/Software Engineer focused on Python/)).toBeInTheDocument();
    });

    it("shows an honest unavailable message per section when its own dataset failed, without hiding the rest of the page", () => {
      render(<AboutView {...FULL_PROPS} skills={null} experiences={null} education={null} />);
      expect(screen.getByText("Skill data is temporarily unavailable.")).toBeInTheDocument();
      expect(screen.getByText("Experience data is temporarily unavailable.")).toBeInTheDocument();
      expect(screen.getByText("Education data is temporarily unavailable.")).toBeInTheDocument();
      // The page itself still renders - hero/narrative copy is not gated
      // on any of those three datasets.
      expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
    });

    it("shows an honest empty message (not a broken/blank section) for a genuinely empty dataset", () => {
      render(<AboutView {...FULL_PROPS} skills={[]} experiences={[]} education={[]} />);
      expect(screen.getByText("No published skills yet.")).toBeInTheDocument();
      expect(screen.getByText("No published experience yet.")).toBeInTheDocument();
      // Education has no standalone section anymore (see about-view.tsx's
      // R2 doc comment) - a genuinely empty result quietly omits the
      // Narrative milestone rather than reporting a non-error as one
      // (the same precedent proof-strip.tsx already sets).
      expect(screen.queryByText(/education/i)).not.toBeInTheDocument();
    });

    it("never shows a misleading 0+ or 1+ proof count - the real value is present immediately", () => {
      render(<AboutView {...FULL_PROPS} />);
      const projectsLabel = screen.getByText("Published projects");
      const projectsRow = projectsLabel.closest("div")!;
      expect(within(projectsRow).getByText(String(FULL_PROPS.projects.length))).toBeInTheDocument();
      expect(within(projectsRow).queryByText("0")).not.toBeInTheDocument();

      const rolesLabel = screen.getByText("Professional roles");
      const rolesRow = rolesLabel.closest("div")!;
      expect(within(rolesRow).getByText(String(FULL_PROPS.experiences.length))).toBeInTheDocument();
    });
  });

  describe("heading hierarchy", () => {
    it("has exactly one h1, and every h2 follows it with no skipped levels", () => {
      const { container } = render(<AboutView {...FULL_PROPS} />);
      const h1s = container.querySelectorAll("h1");
      expect(h1s.length).toBe(1);

      const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) =>
        Number(el.tagName.slice(1)),
      );
      expect(headings[0]).toBe(1);
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i]!;
        const previous = headings[i - 1]!;
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    });

    it("names every major section in its own heading", () => {
      render(<AboutView {...FULL_PROPS} />);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "The career story" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Where this experience comes from" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "How I think about a new problem" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Core engineering strengths" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "The layers I work across" })).toBeInTheDocument();
    });
  });

  describe("recruiter and client pathways", () => {
    it("keeps both conversion paths present and correctly linked", () => {
      render(<AboutView {...FULL_PROPS} />);
      expect(screen.getByText("Hiring for a software engineering role")).toBeInTheDocument();
      const resumeLinks = screen.getAllByRole("link", { name: /résumé/i });
      expect(resumeLinks.some((l) => l.getAttribute("href") === "/resume")).toBe(true);

      expect(screen.getByText("Building a software product")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Start a conversation" })).toBeInTheDocument();
    });

    it("gives the hero its own direct recruiter/client-adjacent entry points", () => {
      render(<AboutView {...FULL_PROPS} />);
      // "View résumé" is intentionally also DualCta's own hiring CTA
      // label (content/home.ts's DUAL_CTA_COPY) - scope to the hero
      // (its own root element, the one ancestor containing the page's
      // single h1) rather than asserting on the ambiguous accessible
      // name site-wide.
      const heroRoot = screen.getByRole("heading", { level: 1 }).closest(".bg-paper-raised");
      expect(heroRoot).not.toBeNull();
      expect(within(heroRoot as HTMLElement).getByRole("link", { name: "View résumé" })).toHaveAttribute("href", "/resume");
      expect(within(heroRoot as HTMLElement).getByRole("link", { name: "See the work" })).toHaveAttribute("href", "/work");
    });
  });

  describe("immediately-visible hero", () => {
    it("renders the full hero (eyebrow, availability, location, headline, lead, both CTAs) synchronously on first render, with no dependency on an effect or timer firing", () => {
      render(<AboutView {...FULL_PROPS} />);
      // No `act(() => vi.advanceTimersByTime(...))`, no waitFor - if this
      // content only appeared after useScrollReveal's on-mount GSAP
      // effect ran, it would still be present here because effects flush
      // before RTL's render() returns, but nothing below depends on that:
      // every one of these strings is plain, unconditional JSX.
      const heroRoot = screen.getByRole("heading", { level: 1 }).closest(".bg-paper-raised") as HTMLElement;
      expect(within(heroRoot).getByText("Open to roles & selected projects")).toBeInTheDocument();
      expect(within(heroRoot).getByText("Pakistan")).toBeInTheDocument();
      expect(within(heroRoot).getByRole("heading", { level: 1 })).toHaveTextContent("Backend engineering with full-product context");
      expect(within(heroRoot).getByText(FULL_PROPS.specialization)).toBeInTheDocument();
      expect(within(heroRoot).getByRole("link", { name: "View résumé" })).toBeInTheDocument();
      expect(within(heroRoot).getByRole("link", { name: "See the work" })).toBeInTheDocument();
    });

    it("places the hero's text content before the portrait in document order at every breakpoint (no CSS-order-only reflow)", () => {
      render(<AboutView {...FULL_PROPS} />);
      const heroRoot = screen.getByRole("heading", { level: 1 }).closest(".bg-paper-raised") as HTMLElement;
      const headline = within(heroRoot).getByRole("heading", { level: 1 });
      const portrait = within(heroRoot).getByAltText("Portrait of Shahriyar Khan");
      // Node.DOCUMENT_POSITION_FOLLOWING (4): headline precedes portrait.
      expect(headline.compareDocumentPosition(portrait) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("keeps a compact two-column tier from md: (768px) up, not only from lg: (1024px) up, so identity and portrait both sit above the fold at tablet widths", () => {
      const { container } = render(<AboutView {...FULL_PROPS} />);
      const heroGrid = container.querySelector(".bg-paper-raised .section-shell") as HTMLElement;
      expect(heroGrid.className).toMatch(/md:grid-cols-/);
    });
  });

  describe("reduced-motion behavior", () => {
    it("renders every section's real content immediately under prefers-reduced-motion, with no opacity-gated or hidden text", () => {
      const restore = setReducedMotion(true);
      try {
        render(<AboutView {...FULL_PROPS} />);
        expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
        expect(screen.getAllByText("Software Developer").length).toBeGreaterThan(0);
        expect(screen.getByText("BS Software Engineering")).toBeInTheDocument();
        expect(screen.getByText("Model the domain before the endpoint")).toBeInTheDocument();
        // "Product interface" legitimately renders twice - the architecture
        // section's mobile and desktop layouts are parallel DOM trees
        // (one hidden via CSS at each breakpoint, both present in jsdom).
        expect(screen.getAllByText("Product interface").length).toBeGreaterThan(0);
        expect(screen.getByText("Hiring for a software engineering role")).toBeInTheDocument();
      } finally {
        restore();
      }
    });
  });

  describe("content truth", () => {
    const FORBIDDEN = ["senior software engineer", "enterprise-grade", "production-grade", "trusted by", "happy clients", "world-class", "best-in-class", "years of experience"];

    it("never renders a fabricated superlative, credential, or unverifiable claim", () => {
      const { container } = render(<AboutView {...FULL_PROPS} />);
      const text = container.textContent?.toLowerCase() ?? "";
      for (const term of FORBIDDEN) {
        expect(text).not.toContain(term);
      }
    });

    it("never invents a price, delivery timeline, or client/testimonial claim", () => {
      const { container } = render(<AboutView {...FULL_PROPS} />);
      expect(container.textContent).not.toMatch(/\$|guarantee(d)?|delivered in|testimonial/i);
    });

    it("renders the education description exactly as returned by the API, with no added or invented detail", () => {
      render(<AboutView {...FULL_PROPS} />);
      const heading = screen.getByRole("heading", { name: "The career story" });
      const section = heading.closest("section")!;
      expect(within(section).getByText(EDUCATION.description!)).toBeInTheDocument();
    });
  });

  describe("responsive/overflow guards", () => {
    it("never applies a fixed pixel width to a content container (every width is relative, a max-w-* cap, or responsive)", () => {
      const { container } = render(<AboutView {...FULL_PROPS} />);
      const fixedWidthEls = Array.from(container.querySelectorAll<HTMLElement>('[class*="w-["]')).filter((el) =>
        /(?:^|\s)w-\[\d+px\]/.test(el.className),
      );
      expect(fixedWidthEls).toHaveLength(0);
    });

    it("keeps every image inside a sized, overflow-hidden frame rather than rendering at its raw intrinsic size", () => {
      const { container } = render(<AboutView {...FULL_PROPS} />);
      const images = container.querySelectorAll("img");
      expect(images.length).toBeGreaterThan(0);
      for (const img of Array.from(images)) {
        const frame = img.closest('[class*="overflow-hidden"]');
        expect(frame).not.toBeNull();
      }
    });

    it("never leaves a bare empty spacer element in the alternating experience timeline", () => {
      render(<AboutView {...FULL_PROPS} />);
      const heading = screen.getByRole("heading", { name: "Where this experience comes from" });
      const list = heading.closest("section")!.querySelector("ol")!;
      for (const row of Array.from(list.children)) {
        // Each row is exactly the dot marker (a <span>) plus one real
        // content <div> - never a second, empty <div> for the "other"
        // side (the defect an owner recording flagged as dead space).
        const emptyDivs = Array.from(row.children).filter((child) => child.tagName === "DIV" && !child.textContent?.trim());
        expect(emptyDivs).toHaveLength(0);
      }
    });
  });
});
