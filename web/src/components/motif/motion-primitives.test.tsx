import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageReveal } from "@/components/motif/image-reveal";
import { SignalLine } from "@/components/motif/signal-line";

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
  vi.restoreAllMocks();
  mockReducedMotion(false);
});

/**
 * Both motifs must fail open: real content (ImageReveal's children) or
 * the decorative signal path (SignalLine) is always present in the DOM
 * from first render, and CSS in globals.css is the only thing ever
 * allowed to visually hide it - gated behind `data-enhanced`, which
 * these components must never set under prefers-reduced-motion. See the
 * `[data-image-reveal]`/`[data-signal-line]` rules in globals.css for
 * the other half of this guarantee.
 */
describe("ImageReveal", () => {
  it("always renders its children, regardless of whether the reveal has activated", () => {
    render(
      <ImageReveal>
        <img alt="Portrait of Shahriyar Khan" src="/images/profile.png" />
      </ImageReveal>,
    );
    expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
  });

  it("never enhances (never sets data-enhanced) under prefers-reduced-motion", () => {
    mockReducedMotion(true);
    const { container } = render(
      <ImageReveal>
        <img alt="Portrait of Shahriyar Khan" src="/images/profile.png" />
      </ImageReveal>,
    );
    expect(container.querySelector("[data-image-reveal]")).not.toHaveAttribute("data-enhanced");
  });
});

describe("SignalLine", () => {
  it("always renders the full drawn path and every pulse node in the DOM", () => {
    const { container } = render(<SignalLine pulses={3} />);
    expect(container.querySelector("path[data-draw]")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pulse]").length).toBe(3);
  });

  it("never enhances (never sets data-enhanced) under prefers-reduced-motion", () => {
    mockReducedMotion(true);
    const { container } = render(<SignalLine />);
    expect(container.querySelector("[data-signal-line]")).not.toHaveAttribute("data-enhanced");
  });
});
