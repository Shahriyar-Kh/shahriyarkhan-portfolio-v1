import { act, render, screen } from "@testing-library/react";
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
// FINAL-DESIGN-01B-01-R3-NAV-FIX: mutable so tests can simulate a real
// route change (usePathname returning a new value) while MobileNav
// itself stays mounted, exactly like the persistent header does across
// a client-side Next.js navigation.
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { MobileNav } from "@/components/layout/mobile-nav";
import { PRIMARY_NAV } from "@/content/nav";

describe("MobileNav", () => {
  it("is closed by default and opens the menu panel on trigger click", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={PRIMARY_NAV} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open menu/i }));

    expect(screen.getByRole("dialog", { name: /site menu/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Work" })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={PRIMARY_NAV} />);

    const trigger = screen.getByRole("button", { name: /open menu/i });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open menu/i })).toHaveFocus();
  });

  it("exposes both conversion CTAs and a résumé link, not just the nav list", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={PRIMARY_NAV} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));

    expect(screen.getByRole("link", { name: "Start a project" })).toHaveAttribute("data-analytics-event", "project_cta_click");
    expect(screen.getByRole("link", { name: "Discuss a role" })).toHaveAttribute("data-analytics-event", "recruiter_cta_click");
    expect(screen.getByRole("link", { name: /view résumé/i })).toBeInTheDocument();
  });

  it("exposes an email contact link and both social links", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={PRIMARY_NAV} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));

    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    const emailLink = screen.getByRole("link", { name: /@/ });
    expect(emailLink.getAttribute("href")).toMatch(/^mailto:/);
  });

  it("gates its trigger wrapper behind the shared header-nav breakpoint, not the old md breakpoint", () => {
    const { container } = render(<MobileNav items={PRIMARY_NAV} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("header-nav:hidden");
    expect(wrapper.className).not.toMatch(/\bmd:hidden\b/);
  });

  /**
   * FINAL-DESIGN-01A-R6-FIX3: top offset and height are both driven by
   * the same --header-h token site-header.tsx publishes, instead of a
   * static top-16/sm:top-20 + bottom-0 guess that could drift out of
   * sync with the header's real rendered height.
   */
  it("positions the panel using the shared --header-h token, not a static top/bottom guess", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={PRIMARY_NAV} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.style.top).toBe("var(--header-h)");
    expect(dialog.style.height).toBe("calc(100dvh - var(--header-h))");
  });

  describe("scroll lock", () => {
    afterEach(() => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      mockPathname = "/";
    });

    it("locks the body with position:fixed (not just overflow:hidden) while open", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "scrollY", { value: 240, writable: true, configurable: true });

      render(<MobileNav items={PRIMARY_NAV} />);
      await user.click(screen.getByRole("button", { name: /open menu/i }));

      expect(document.body.style.position).toBe("fixed");
      expect(document.body.style.top).toBe("-240px");
      expect(document.body.style.width).toBe("100%");
      expect(document.body.style.overflow).toBe("hidden");
    });

    /**
     * FINAL-DESIGN-01B-01-R3-NAV-FIX regression: an owner recording
     * showed the homepage landing around its counters (not the top)
     * after opening the mobile menu from a scrolled-down /about and
     * tapping Home. Root cause (confirmed via
     * scripts/verify-mobile-nav-scroll.mjs against a real browser): the
     * scroll-lock cleanup unconditionally called
     * `window.scrollTo(0, scrollY)` on every close, including a close
     * caused by a route change - restoring the *previous* route's
     * scroll position onto the page that had just navigated. These
     * tests assert the fix directly on the two paths that must now
     * differ.
     */
    it("X/Escape dismissal on the SAME route restores the exact prior scroll position, instantly", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "scrollY", { value: 240, writable: true, configurable: true });
      const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      render(<MobileNav items={PRIMARY_NAV} />);
      await user.click(screen.getByRole("button", { name: /open menu/i }));
      await user.keyboard("{Escape}");

      expect(document.body.style.position).toBe("");
      expect(document.body.style.overflow).toBe("");
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 240, left: 0, behavior: "instant" });

      scrollToSpy.mockRestore();
    });

    it("dismissal via the close (X) button also restores scroll, not just Escape", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "scrollY", { value: 512, writable: true, configurable: true });
      const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      render(<MobileNav items={PRIMARY_NAV} />);
      await user.click(screen.getByRole("button", { name: /open menu/i }));
      await user.click(screen.getByRole("button", { name: /close menu/i }));

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 512, left: 0, behavior: "instant" });
      scrollToSpy.mockRestore();
    });

    it("a route change while open never restores the previous route's scroll position", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "scrollY", { value: 4500, writable: true, configurable: true });
      const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      const { rerender } = render(<MobileNav items={PRIMARY_NAV} />);
      await user.click(screen.getByRole("button", { name: /open menu/i }));
      expect(document.body.style.position).toBe("fixed");

      // Simulate the app-wide effect of clicking a nav link: the route
      // changes underneath this same, still-mounted header component
      // (usePathname now returns the destination), exactly like a real
      // Next.js client-side navigation - MobileNav is never unmounted
      // by this.
      mockPathname = "/skills";
      rerender(<MobileNav items={PRIMARY_NAV} />);

      // The panel must close and the body lock must fully release...
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.body.style.position).toBe("");
      expect(document.body.style.top).toBe("");
      expect(document.body.style.width).toBe("");
      expect(document.body.style.overflow).toBe("");
      // ...but the old route's scroll position must never be reapplied,
      // leaving the destination wherever it naturally landed (the top,
      // per Next.js's own default navigation behavior).
      expect(scrollToSpy).not.toHaveBeenCalled();

      scrollToSpy.mockRestore();
    });

    it("a rapid open-then-immediate-link-activation never restores the previous route's scroll position", async () => {
      Object.defineProperty(window, "scrollY", { value: 3000, writable: true, configurable: true });
      const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      const { rerender } = render(<MobileNav items={PRIMARY_NAV} />);
      await userEvent.setup().click(screen.getByRole("button", { name: /open menu/i }));
      // No delay between open and the simulated navigation - the fix
      // must not depend on any minimum time-in-panel.
      mockPathname = "/work";
      rerender(<MobileNav items={PRIMARY_NAV} />);

      expect(document.body.style.position).toBe("");
      expect(scrollToSpy).not.toHaveBeenCalled();
      scrollToSpy.mockRestore();
    });

    it("holds under prefers-reduced-motion too - dismissal still restores, navigation still doesn't", async () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = ((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;

      try {
        Object.defineProperty(window, "scrollY", { value: 900, writable: true, configurable: true });
        const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        const user = userEvent.setup();

        const { rerender } = render(<MobileNav items={PRIMARY_NAV} />);
        await user.click(screen.getByRole("button", { name: /open menu/i }));
        await user.keyboard("{Escape}");
        expect(scrollToSpy).toHaveBeenCalledWith({ top: 900, left: 0, behavior: "instant" });
        scrollToSpy.mockClear();

        await user.click(screen.getByRole("button", { name: /open menu/i }));
        mockPathname = "/contact";
        rerender(<MobileNav items={PRIMARY_NAV} />);
        expect(scrollToSpy).not.toHaveBeenCalled();

        scrollToSpy.mockRestore();
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    });
  });

  describe("auto-close on resize past the header-nav breakpoint", () => {
    afterEach(() => {
      document.documentElement.style.removeProperty("--breakpoint-header-nav");
    });

    it("closes the open panel once a resize crosses the breakpoint", async () => {
      const user = userEvent.setup();
      document.documentElement.style.setProperty("--breakpoint-header-nav", "52.5rem");

      let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;
      const mediaQueryList = {
        matches: false,
        media: "(min-width: 52.5rem)",
        addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
          changeHandler = handler;
        },
        removeEventListener: () => {},
      };
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue(mediaQueryList as unknown as MediaQueryList);

      render(<MobileNav items={PRIMARY_NAV} />);
      await user.click(screen.getByRole("button", { name: /open menu/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      act(() => {
        changeHandler?.({ matches: true } as MediaQueryListEvent);
      });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      matchMediaSpy.mockRestore();
    });
  });
});
