import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const usePathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

import { SiteHeader } from "@/components/layout/site-header";

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, writable: true, configurable: true });
}

describe("SiteHeader", () => {
  afterEach(() => {
    usePathnameMock.mockReturnValue("/");
    setScrollY(0);
  });

  /**
   * FINAL-DESIGN-01A-R4 Part B: the header used to swap to a light
   * (paper) surface with dark text once scrolled, on the assumption every
   * route opens on the homepage's ink hero. Every inner page (/about,
   * /work, /services, ...) actually opens on the paper background, so
   * that swap put light nav text over a light page for the first 96px of
   * scroll - a real invisible-navigation bug, not just low contrast. The
   * header is now a permanent dark surface; only the border/shadow may
   * change with scroll, never the background/text color.
   */
  it("stays a dark, paper-on-ink surface before and after the scroll threshold", () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector("header")!;
    expect(header.className).toContain("bg-ink/92");
    expect(header.className).toContain("text-paper-primary");
    expect(header.className).not.toMatch(/\bbg-background\b/);

    act(() => {
      setScrollY(200);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(header.className).toContain("bg-ink/92");
    expect(header.className).toContain("text-paper-primary");
  });

  it("marks the active route with aria-current and a distinct capsule style, not color alone", () => {
    usePathnameMock.mockReturnValue("/services");
    render(<SiteHeader />);

    const active = screen.getByRole("link", { name: "Services" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.className).toContain("border-primary-on-ink/40");
    expect(active.className).toContain("bg-primary-on-ink/12");

    const inactive = screen.getByRole("link", { name: "Work" });
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive.className).not.toContain("bg-primary-on-ink/12");
  });

  it("gives every nav link a rounded capsule shape so hover/focus match", () => {
    render(<SiteHeader />);
    for (const label of ["Home", "About", "Skills", "Work", "Services", "Contact"]) {
      const link = screen.getByRole("link", { name: label });
      expect(link.className).toContain("rounded-full");
    }
  });

  it("renders a stronger, filled Résumé CTA", () => {
    render(<SiteHeader />);
    const resume = screen.getByRole("link", { name: "Résumé" });
    expect(resume).toHaveAttribute("href", "/resume");
    expect(resume.className).toContain("bg-primary-on-ink");
  });

  it("keeps the SK mark's orange signal node visible on the dark surface", () => {
    const { container } = render(<SiteHeader />);
    const circle = container.querySelector("svg circle");
    expect(circle).toHaveClass("fill-primary-on-ink");
  });

  /**
   * FINAL-DESIGN-01A-R6-FIX3: at Tailwind's default "md" (768px), the
   * full desktop nav already displayed but didn't actually fit -
   * measured in a real browser, the brand link wrapped onto two lines.
   * The desktop nav, the Résumé CTA, and MobileNav's own trigger wrapper
   * must all gate on the SAME custom `header-nav:` breakpoint (840px,
   * see globals.css) - never the old `md:` - so desktop and mobile
   * controls can never both show or both disappear at some width.
   */
  it("gates desktop nav, the Résumé CTA, and the mobile trigger behind the same header-nav breakpoint, not md", () => {
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav.className).toContain("header-nav:flex");
    expect(nav.className).not.toMatch(/\bmd:flex\b/);

    const resumeLink = screen.getByRole("link", { name: "Résumé" });
    const resumeWrapper = resumeLink.parentElement!;
    expect(resumeWrapper.className).toContain("header-nav:flex");
    expect(resumeWrapper.className).not.toMatch(/\bmd:flex\b/);

    // MobileNav is rendered for real (not mocked) inside SiteHeader -
    // its trigger wrapper must use the exact same token.
    const trigger = screen.getByRole("button", { name: /open menu/i });
    const triggerWrapper = trigger.parentElement!;
    expect(triggerWrapper.className).toContain("header-nav:hidden");
    expect(triggerWrapper.className).not.toMatch(/\bmd:hidden\b/);
  });

  it("never lets the brand wrap - forces it to a single line with whitespace-nowrap", () => {
    render(<SiteHeader />);
    const brand = screen.getByRole("link", { name: /Shahriyar Khan/ });
    expect(brand.className).toContain("whitespace-nowrap");
  });

  it("publishes its own real rendered height to --header-h so the mobile panel can never drift out of sync", () => {
    const realGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function mockRect(this: HTMLElement) {
      if (this.tagName === "HEADER") {
        return { height: 72, width: 1024, top: 0, left: 0, right: 1024, bottom: 72, x: 0, y: 0, toJSON: () => {} } as DOMRect;
      }
      return realGetBoundingClientRect.call(this);
    };

    try {
      render(<SiteHeader />);
      expect(document.documentElement.style.getPropertyValue("--header-h")).toBe("72px");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = realGetBoundingClientRect;
    }
  });
});
