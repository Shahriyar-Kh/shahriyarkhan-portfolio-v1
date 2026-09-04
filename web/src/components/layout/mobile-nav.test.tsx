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
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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
    });

    it("locks the body with position:fixed (not just overflow:hidden) while open, and restores it + scroll position on close", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "scrollY", { value: 240, writable: true, configurable: true });
      const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      render(<MobileNav items={PRIMARY_NAV} />);
      await user.click(screen.getByRole("button", { name: /open menu/i }));

      expect(document.body.style.position).toBe("fixed");
      expect(document.body.style.top).toBe("-240px");
      expect(document.body.style.width).toBe("100%");
      expect(document.body.style.overflow).toBe("hidden");

      await user.keyboard("{Escape}");

      expect(document.body.style.position).toBe("");
      expect(document.body.style.overflow).toBe("");
      expect(scrollToSpy).toHaveBeenCalledWith(0, 240);

      scrollToSpy.mockRestore();
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
