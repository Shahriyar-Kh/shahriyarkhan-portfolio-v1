import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumeView } from "@/components/views/resume-view";
import { RESUME_PDF_PATH } from "@/content/site";
import type { PublishedResumePageState, FallbackResumePageState, ResumePageState } from "@/lib/resume-page-state";

const PUBLISHED_STATE: PublishedResumePageState = {
  source: "default_version",
  usedFallback: false,
  name: "Jordan Ashworth",
  professionalTitle: "Software Engineer | Python & Django Full-Stack Developer",
  contacts: [
    [{ text: "jordan@example.invalid", href: null }],
    [{ text: "Sample City", href: null }],
    [{ text: "https://example.invalid/jordan", href: "https://example.invalid/jordan" }],
  ],
  sections: [
    { key: "summary", heading: "PROFESSIONAL SUMMARY", items: [[{ text: "Backend engineer with a track record of measurable delivery.", href: null }]] },
    { key: "skills", heading: "SKILLS", items: [[{ text: "Python, Django, PostgreSQL", href: null }]] },
    { key: "experience", heading: "EXPERIENCE", items: [[{ text: "Software Engineer, Example Systems Inc. (2021-2025)", href: null }]] },
    { key: "projects", heading: "PROJECTS", items: [[{ text: "Portfolio Résumé Platform", href: null }]] },
    { key: "education", heading: "EDUCATION", items: [[{ text: "BSc Computer Science - Example University", href: null }]] },
    {
      key: "certifications",
      heading: "CERTIFICATIONS",
      items: [[{ text: "Verified Secure Software Practitioner", href: "https://credentials.example.invalid/vssp-1" }]],
    },
  ],
  downloads: { pdf: true, docx: true },
};

const FALLBACK_STATE: FallbackResumePageState = {
  source: "composed_from_lists",
  usedFallback: true,
  name: "Jordan Ashworth",
  professionalTitle: "Software Engineer | Python & Django Full-Stack Developer",
  contactEmail: "jordan@example.invalid",
  contactLocation: "Sample City",
  contactLinks: [
    { label: "GitHub", href: "https://github.example.invalid/jordan" },
    { label: "LinkedIn", href: "https://linkedin.example.invalid/jordan" },
  ],
  summary: null,
  skills: [
    {
      id: 1,
      name: "Django",
      description: "",
      level: 4,
      icon_or_badge: "",
      category: { id: 1, name: "Backend", slug: "backend", display_order: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      published: true,
      display_order: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  experiences: [
    {
      id: 1,
      company_name: "Example Systems Inc.",
      role_title: "Software Engineer",
      start_date: "2021-01-01",
      end_date: null,
      location: "",
      description: "",
      achievements: [],
      technologies: [],
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
    },
  ],
  projects: [
    {
      id: 1,
      title: "Portfolio Résumé Platform",
      slug: "portfolio-resume-platform",
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
    },
  ],
  education: [
    {
      id: 1,
      institution: "Example University",
      degree: "BSc Computer Science",
      start_date: "2016-09-01",
      end_date: "2020-06-01",
      description: "",
      status: "published",
      published_at: "2026-01-01T00:00:00Z",
      display_order: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  certifications: [],
  downloads: { pdf: false, docx: false },
};

describe("ResumeView (published snapshot)", () => {
  it("renders exactly one h1 with the snapshot name and title as its subtitle", () => {
    render(<ResumeView state={PUBLISHED_STATE} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jordan Ashworth");
    expect(screen.getByText("Software Engineer | Python & Django Full-Stack Developer")).toBeInTheDocument();
  });

  it("renders sections in exactly the snapshot's order, including the summary heading", () => {
    const { container } = render(<ResumeView state={PUBLISHED_STATE} />);
    const headings = Array.from(container.querySelectorAll("h1, h2")).map((el) => el.textContent);
    expect(headings).toEqual([
      "Jordan Ashworth",
      "PROFESSIONAL SUMMARY",
      "SKILLS",
      "EXPERIENCE",
      "PROJECTS",
      "EDUCATION",
      "CERTIFICATIONS",
    ]);
  });

  it("omits a section entirely when the snapshot document has none for it", () => {
    const state: PublishedResumePageState = { ...PUBLISHED_STATE, sections: PUBLISHED_STATE.sections.filter((s) => s.key !== "certifications") };
    render(<ResumeView state={state} />);
    expect(screen.queryByText("CERTIFICATIONS")).not.toBeInTheDocument();
    expect(screen.getByText("SKILLS")).toBeInTheDocument();
  });

  it("shows both download buttons when both formats are available, linking to the stable backend routes", () => {
    render(<ResumeView state={PUBLISHED_STATE} />);
    const pdfLink = screen.getByRole("link", { name: /download pdf/i });
    const docxLink = screen.getByRole("link", { name: /download docx/i });
    expect(pdfLink).toHaveAttribute("href", expect.stringContaining("/api/v1/public/resume/default/download/pdf"));
    expect(docxLink).toHaveAttribute("href", expect.stringContaining("/api/v1/public/resume/default/download/docx"));
  });

  it("shows only the available format when just one export exists", () => {
    const state: PublishedResumePageState = { ...PUBLISHED_STATE, downloads: { pdf: true, docx: false } };
    render(<ResumeView state={state} />);
    expect(screen.getByRole("link", { name: /download pdf/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download docx/i })).not.toBeInTheDocument();
  });

  it("shows no download button and a clear unavailable message when neither format exists", () => {
    const state: PublishedResumePageState = { ...PUBLISHED_STATE, downloads: { pdf: false, docx: false } };
    render(<ResumeView state={state} />);
    expect(screen.queryByRole("link", { name: /download pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download docx/i })).not.toBeInTheDocument();
    expect(screen.getByText(/not available right now/i)).toBeInTheDocument();
  });

  it("never links the old bundled static PDF", () => {
    const { container } = render(<ResumeView state={PUBLISHED_STATE} />);
    expect(container.querySelector(`a[href="${RESUME_PDF_PATH}"]`)).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain(RESUME_PDF_PATH);
  });

  it("renders an embedded snapshot link (e.g. a certification credential) as a safe external link", () => {
    render(<ResumeView state={PUBLISHED_STATE} />);
    const link = screen.getByRole("link", { name: "Verified Secure Software Practitioner" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("never shows the composed-from-lists fallback notice for a published snapshot", () => {
    render(<ResumeView state={PUBLISHED_STATE} />);
    expect(screen.queryByText(/not an approved generated résumé document/i)).not.toBeInTheDocument();
  });

  it("renders no governance, provenance, ATS score, or application data", () => {
    const { container } = render(<ResumeView state={PUBLISHED_STATE} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ats score|readiness score|approved by|published by|source_facts|source_hash|claim_id|job application/i);
  });

  it("has no skipped heading levels", () => {
    const { container } = render(<ResumeView state={PUBLISHED_STATE} />);
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
    expect(headings[0]).toBe(1);
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i]! - headings[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  // RESUME-UX-01: the résumé is presented as a professional document with
  // download actions repeated at the end, not only at the top.
  it("labels the page as the current Master Resume", () => {
    render(<ResumeView state={PUBLISHED_STATE} />);
    expect(screen.getByText("Master Resume")).toBeInTheDocument();
  });

  it("repeats both download actions at the end of the résumé preview, distinct from the top buttons", () => {
    render(<ResumeView state={PUBLISHED_STATE} />);

    // Exactly one top-of-page match for each simple name (would throw on
    // getByRole if the bottom CTA collided with this pattern).
    const topPdf = screen.getByRole("link", { name: /^download pdf$/i });
    const topDocx = screen.getByRole("link", { name: /^download docx$/i });
    const bottomPdf = screen.getByRole("link", { name: /download ats resume.*pdf/i });
    const bottomDocx = screen.getByRole("link", { name: /download editable resume.*docx/i });

    expect(topPdf).toHaveAttribute("href", expect.stringContaining("/api/v1/public/resume/default/download/pdf"));
    expect(topDocx).toHaveAttribute("href", expect.stringContaining("/api/v1/public/resume/default/download/docx"));
    expect(bottomPdf).toHaveAttribute("href", topPdf.getAttribute("href"));
    expect(bottomDocx).toHaveAttribute("href", topDocx.getAttribute("href"));
    expect(bottomPdf).not.toBe(topPdf);
  });

  it("omits the repeated bottom CTA when neither format is available", () => {
    const state: PublishedResumePageState = { ...PUBLISHED_STATE, downloads: { pdf: false, docx: false } };
    render(<ResumeView state={state} />);
    expect(screen.queryByText(/download ats resume/i)).not.toBeInTheDocument();
  });

  it("offers a non-intrusive recruiter contact CTA after the résumé preview", () => {
    render(<ResumeView state={PUBLISHED_STATE} />);
    const link = screen.getByRole("link", { name: /contact shahriyar/i });
    expect(link).toHaveAttribute("href", "/contact");
  });

  it("presents the résumé content inside a distinct document surface", () => {
    const { container } = render(<ResumeView state={PUBLISHED_STATE} />);
    expect(container.querySelector(".surface-elevated")).toBeInTheDocument();
  });
});

describe("ResumeView (no-published-master fallback)", () => {
  it("shows the fallback notice, distinct from an approved generated résumé", () => {
    render(<ResumeView state={FALLBACK_STATE} />);
    expect(screen.getByText(/not an approved generated résumé document/i)).toBeInTheDocument();
  });

  it("renders live-sourced sections with a real project link and skill level badge", () => {
    render(<ResumeView state={FALLBACK_STATE} />);
    expect(screen.getByRole("link", { name: "Portfolio Résumé Platform" })).toHaveAttribute("href", "/work/portfolio-resume-platform");
    expect(screen.getByText(/Django · Expert/)).toBeInTheDocument();
  });

  it("omits an empty section (no certifications in the fallback state)", () => {
    render(<ResumeView state={FALLBACK_STATE} />);
    expect(screen.queryByText("Verified certifications")).not.toBeInTheDocument();
  });

  it("shows no download buttons and no old static PDF link", () => {
    const { container } = render(<ResumeView state={FALLBACK_STATE} />);
    expect(screen.queryByRole("link", { name: /download pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download docx/i })).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain(RESUME_PDF_PATH);
  });

  it("renders exactly one h1 in the fallback state too", () => {
    render(<ResumeView state={FALLBACK_STATE} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("does not show the recruiter contact CTA for the unapproved fallback content", () => {
    render(<ResumeView state={FALLBACK_STATE} />);
    expect(screen.queryByRole("link", { name: /contact shahriyar/i })).not.toBeInTheDocument();
  });
});

// Exercised only to prove the discriminated union type is exhaustive at
// the type level - not rendered.
function _typeExhaustivenessCheck(state: ResumePageState) {
  if (state.usedFallback) return state.contactEmail;
  return state.sections;
}
void _typeExhaustivenessCheck;
