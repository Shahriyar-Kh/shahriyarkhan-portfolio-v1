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

import { Hero } from "@/components/sections/hero";

function mockReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  mockReducedMotion(false);
});

describe("Hero", () => {
  it("renders the headline and the portrait together, unconditionally", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1, name: "Shahriyar Khan" })).toBeInTheDocument();
    expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
  });

  it("keeps every element visible under prefers-reduced-motion - no staged sequence runs", () => {
    mockReducedMotion(true);
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1, name: "Shahriyar Khan" })).toBeInTheDocument();
    expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
    expect(screen.getByText("Open to new roles & selected projects")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view résumé/i })).toBeInTheDocument();
  });

  it("keeps both the recruiter and client CTA reachable with the correct analytics contract", () => {
    render(<Hero />);
    const seeWork = screen.getByRole("link", { name: "View engineering work" });
    const startProject = screen.getByRole("link", { name: "Discuss a project" });
    expect(seeWork).toHaveAttribute("data-analytics-event", "recruiter_cta_click");
    expect(startProject).toHaveAttribute("data-analytics-event", "project_cta_click");
  });

  it("keeps the lead paragraph's real text intact despite the color-swept phrase span", () => {
    render(<Hero />);
    const lead = screen.getByText("Python/Django").closest("p");
    expect(lead?.textContent).toBe(
      "Python/Django backend engineering for REST APIs, authenticated products, and backend-heavy full-stack systems.",
    );
  });

  it("does not render the retired landing-page SignalLine or stepped-graph decoration", () => {
    const { container } = render(<Hero />);
    expect(container.querySelector("[data-hero-portrait-halo]")).not.toBeInTheDocument();
    expect(container.querySelector("[data-signal-line]")).not.toBeInTheDocument();
    const paths = Array.from(container.querySelectorAll("path"));
    const hasSteppedGraph = paths.some((p) => p.getAttribute("d")?.includes("L22 20 L22 8"));
    expect(hasSteppedGraph).toBe(false);
  });
});
