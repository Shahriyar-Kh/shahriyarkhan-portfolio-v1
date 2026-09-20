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

/**
 * FINAL-DESIGN-01A-R2 §5/§17: the mobile hero must include the portrait
 * as part of its first meaningful content, not as a reward for scrolling
 * past the full text stack (see the R2 visual-gap audit). jsdom doesn't
 * apply the responsive CSS that actually reorders the layout per
 * viewport, so this asserts the one thing that's true regardless of
 * viewport and regardless of JS: the portrait <img> is unconditionally
 * in the DOM alongside the headline, not behind client-side state.
 */
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

  /**
   * FINAL-DESIGN-01A-R4 §C: the portrait frame gained a decorative
   * accent-outline layer and a signal-line halo, and the lead paragraph
   * gained a color-swept span around its opening phrase - neither should
   * change the real text content or expose extra noise to assistive tech.
   */
  it("keeps the lead paragraph's real text intact despite the color-swept phrase span", () => {
    render(<Hero />);
    // The sweep span splits the paragraph into two text nodes, so this
    // matches on the <p>'s combined textContent rather than a single
    // node's own text (RTL's default getByText only matches one node).
    const lead = screen.getByText("Python/Django").closest("p");
    expect(lead?.textContent).toBe(
      "Python/Django backend engineering for REST APIs, authenticated products, and backend-heavy full-stack systems.",
    );
  });

  it("marks the portrait frame's signal-line halo aria-hidden and keeps it decorative-only", () => {
    const { container } = render(<Hero />);
    const halo = container.querySelector("[data-hero-portrait-halo]");
    expect(halo).toHaveAttribute("aria-hidden", "true");
    expect(halo?.querySelector("svg")).toBeInTheDocument();
  });
});
