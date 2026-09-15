import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { ResumeView } from "@/components/views/resume-view";
import type { FallbackResumePageState, PublishedResumePageState } from "@/lib/resume-page-state";

const PUBLISHED_STATE: PublishedResumePageState = {
  source: "default_version",
  usedFallback: false,
  name: "Jordan Ashworth",
  professionalTitle: "Software Engineer | Python & Django Full-Stack Developer",
  contacts: [
    [{ text: "jordan@example.invalid", href: null }],
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
  skills: [],
  experiences: [],
  projects: [],
  education: [],
  certifications: [],
  downloads: { pdf: false, docx: false },
};

describe("ResumeView accessibility", () => {
  it("has no axe violations with a full published snapshot (both downloads available)", async () => {
    const { container } = render(<ResumeView state={PUBLISHED_STATE} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations with only one download format available", async () => {
    const state: PublishedResumePageState = { ...PUBLISHED_STATE, downloads: { pdf: true, docx: false } };
    const { container } = render(<ResumeView state={state} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the no-published-master fallback state (no downloads, empty sections)", async () => {
    const { container } = render(<ResumeView state={FALLBACK_STATE} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
