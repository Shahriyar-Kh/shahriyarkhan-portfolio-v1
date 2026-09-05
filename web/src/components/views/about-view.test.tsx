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
      expect(screen.getByText("Software Developer")).toBeInTheDocument();
      expect(screen.getByText("HA Technologies (Pvt) Ltd", { exact: false })).toBeInTheDocument();
      expect(screen.getByText("Python Developer Intern")).toBeInTheDocument();
      expect(screen.getByText("BS Software Engineering")).toBeInTheDocument();
      expect(screen.getByText("Abasyn University, Peshawar")).toBeInTheDocument();
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
      expect(screen.getByText(/Software Engineering graduate specializing in backend development/)).toBeInTheDocument();
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
      expect(screen.getByText("No published education yet.")).toBeInTheDocument();
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
      expect(screen.getByRole("heading", { name: "Core strengths" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "The shape most of these systems take" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Where it started" })).toBeInTheDocument();
    });
  });

  describe("recruiter and client pathways", () => {
    it("keeps both conversion paths present and correctly linked", () => {
      render(<AboutView {...FULL_PROPS} />);
      expect(screen.getByText("Hiring for a role")).toBeInTheDocument();
      const resumeLinks = screen.getAllByRole("link", { name: /résumé/i });
      expect(resumeLinks.some((l) => l.getAttribute("href") === "/resume")).toBe(true);

      expect(screen.getByText("Starting a project")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Get in touch" })).toBeInTheDocument();
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

  describe("reduced-motion behavior", () => {
    it("renders every section's real content immediately under prefers-reduced-motion, with no opacity-gated or hidden text", () => {
      const restore = setReducedMotion(true);
      try {
        render(<AboutView {...FULL_PROPS} />);
        expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
        expect(screen.getByText("Software Developer")).toBeInTheDocument();
        expect(screen.getByText("BS Software Engineering")).toBeInTheDocument();
        expect(screen.getByText("The data model comes first")).toBeInTheDocument();
        // "Interface" legitimately renders twice - the architecture
        // section's mobile and desktop layouts are parallel DOM trees
        // (one hidden via CSS at each breakpoint, both present in jsdom).
        expect(screen.getAllByText("Interface").length).toBeGreaterThan(0);
        expect(screen.getByText("Hiring for a role")).toBeInTheDocument();
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
      const heading = screen.getByRole("heading", { name: "Where it started" });
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
  });
});
