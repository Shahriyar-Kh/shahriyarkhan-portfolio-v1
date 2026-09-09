import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { RouteScrollReset } from "@/components/layout/route-scroll-reset";

describe("RouteScrollReset", () => {
  it("does not scroll on initial mount - the browser's own starting position is already correct", () => {
    mockPathname = "/";
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<RouteScrollReset />);
    expect(scrollToSpy).not.toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });

  it("resets scroll to (0, 0) with an instant jump when the pathname changes after mount", () => {
    mockPathname = "/services/website-development";
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { rerender } = render(<RouteScrollReset />);
    expect(scrollToSpy).not.toHaveBeenCalled();

    mockPathname = "/services/restaurant-website";
    rerender(<RouteScrollReset />);

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
    scrollToSpy.mockRestore();
  });

  it("never resets scroll when the pathname is unchanged (e.g. a query-only update) across a rerender", () => {
    mockPathname = "/contact";
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { rerender } = render(<RouteScrollReset />);

    rerender(<RouteScrollReset />);

    expect(scrollToSpy).not.toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });
});
