import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactView } from "@/components/views/contact-view";
import { WHAT_HAPPENS_NEXT } from "@/content/contact-page";
import type { Service } from "@/lib/api/types";

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

describe("ContactView", () => {
  it("renders exactly one h1 with the real page title", () => {
    const { container } = render(<ContactView services={[]} siteSettings={null} initialIntent="general" />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Get in touch");
  });

  it("renders the real contact-details panel (a mailto link) alongside the inquiry form", () => {
    render(<ContactView services={[]} siteSettings={null} initialIntent="general" />);
    expect(document.querySelector('a[href^="mailto:"]')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("renders the factual what-happens-next register with all three real steps", () => {
    render(<ContactView services={[]} siteSettings={null} initialIntent="general" />);
    expect(screen.getByText("What happens next")).toBeInTheDocument();
    for (const step of WHAT_HAPPENS_NEXT) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it("closes with a restrained line and a direct mailto fallback, never a second full DualCta", () => {
    render(<ContactView services={[]} siteSettings={null} initialIntent="general" />);
    expect(screen.queryByText("Start a project")).not.toBeInTheDocument();
    expect(screen.queryByText("Discuss a role")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view résumé/i })).not.toBeInTheDocument();
    const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
    expect(mailtoLinks.length).toBeGreaterThan(0);
  });

  it("never invents a response-time promise, availability claim, client count, or office hours", () => {
    const { container } = render(<ContactView services={[]} siteSettings={null} initialIntent="general" />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).not.toMatch(/within \d+ (hour|hours|day|days)|24\/7|office hours|\d+\+ clients|always available/);
  });

  it("preselects the intent option from a validated service context", () => {
    render(<ContactView services={SERVICES} siteSettings={null} initialIntent="freelance_project" initialServiceId="1" />);
    expect(screen.getByRole("combobox", { name: /what's this about/i })).toHaveValue("freelance_project");
  });

  it("has no skipped heading levels", () => {
    const { container } = render(<ContactView services={SERVICES} siteSettings={null} initialIntent="general" />);
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
    expect(headings[0]).toBe(1);
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i]! - headings[i - 1]!).toBeLessThanOrEqual(1);
    }
  });
});
