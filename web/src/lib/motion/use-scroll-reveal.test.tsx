import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const revert = vi.fn();
const context = vi.fn((fn: () => void) => {
  fn();
  return { revert };
});
const fakeGsap = { context };

vi.mock("@/lib/motion/gsap-client", () => ({
  getGsap: () => ({ gsap: fakeGsap, ScrollTrigger: {} }),
  isMobileViewport: () => false,
}));

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
  vi.clearAllMocks();
  mockReducedMotion(false);
});

import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

function Probe({ setup }: { setup: (api: unknown) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollReveal(ref, setup as never, []);
  return <div ref={ref}>content</div>;
}

/**
 * FINAL-DESIGN-01A-R2 §17: GSAP client-only safety and cleanup. Every
 * component built on useScrollReveal inherits these guarantees for free
 * - this is the one place they're tested directly rather than once per
 * component.
 */
describe("useScrollReveal", () => {
  it("calls the setup callback inside a gsap.context when motion is allowed", () => {
    const setup = vi.fn();
    render(<Probe setup={setup} />);
    expect(context).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it("never calls setup under prefers-reduced-motion - the base render is the final one", () => {
    mockReducedMotion(true);
    const setup = vi.fn();
    render(<Probe setup={setup} />);
    expect(context).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
  });

  it("reverts the gsap context on unmount, cleaning up every tween/ScrollTrigger it created", () => {
    const { unmount } = render(<Probe setup={vi.fn()} />);
    expect(revert).not.toHaveBeenCalled();
    unmount();
    expect(revert).toHaveBeenCalledTimes(1);
  });
});
