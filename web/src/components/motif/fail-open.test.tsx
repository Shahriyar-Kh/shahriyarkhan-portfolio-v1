import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImageReveal } from "@/components/motif/image-reveal";
import { SignalLine } from "@/components/motif/signal-line";
import { Reveal } from "@/components/layout/reveal";

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** An IntersectionObserver that genuinely exists and whose `observe()`
 * succeeds, but whose callback is never invoked - the specific failure
 * mode named in the FINAL-DESIGN-01A-R3 correction: a component must not
 * mark itself "enhanced" merely because it successfully attached an
 * observer, only once that observer's callback actually proves it's
 * alive. */
class NeverFiringObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const originalIO = window.IntersectionObserver;

afterEach(() => {
  mockMatchMedia(false);
  window.IntersectionObserver = originalIO;
});

/**
 * The five required failure paths (FINAL-DESIGN-01A-R3), run against
 * every component built on the shared data-enhanced/data-active
 * fail-open pattern: Reveal, SignalLine, ImageReveal. See each
 * component's own doc comment for the corrected algorithm.
 */
describe.each([
  {
    name: "Reveal",
    render: () => render(<Reveal>content</Reveal>),
    selector: "[data-reveal]",
  },
  {
    name: "SignalLine",
    render: () => render(<SignalLine />),
    selector: "[data-signal-line]",
  },
  {
    name: "ImageReveal",
    render: () => render(<ImageReveal>content</ImageReveal>),
    selector: "[data-image-reveal]",
  },
])("$name fail-open guarantees", ({ render: renderComponent, selector }) => {
  it("never sets data-enhanced when observe() succeeds but the callback never fires - content stays visible indefinitely", () => {
    window.IntersectionObserver = NeverFiringObserver as unknown as typeof IntersectionObserver;
    const { container } = renderComponent();
    const el = container.querySelector(selector);
    expect(el).not.toHaveAttribute("data-enhanced");
    expect(el).not.toHaveAttribute("data-active");
  });

  it("never bakes a hiding utility class into the static markup - hiding is CSS-attribute-gated only", () => {
    const { container } = renderComponent();
    const el = container.querySelector(selector);
    expect(el?.className ?? "").not.toMatch(/opacity-0/);
  });

  it("enhances and activates atomically when IntersectionObserver is unsupported", () => {
    // @ts-expect-error - simulating a browser with no IO support at all
    delete window.IntersectionObserver;
    const { container } = renderComponent();
    const el = container.querySelector(selector);
    expect(el).toHaveAttribute("data-enhanced", "true");
    expect(el).toHaveAttribute("data-active", "true");
  });

  it("never sets data-enhanced under prefers-reduced-motion", () => {
    mockMatchMedia(true);
    const { container } = renderComponent();
    const el = container.querySelector(selector);
    expect(el).not.toHaveAttribute("data-enhanced");
  });

  it("reveals immediately (enhanced+active together) when the first real callback already reports intersecting", () => {
    class ImmediatelyIntersectingObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: ReadonlyArray<number> = [];
      #callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.#callback = callback;
      }
      observe(target: Element) {
        this.#callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    window.IntersectionObserver = ImmediatelyIntersectingObserver as unknown as typeof IntersectionObserver;
    const { container } = renderComponent();
    const el = container.querySelector(selector);
    expect(el).toHaveAttribute("data-enhanced", "true");
    expect(el).toHaveAttribute("data-active", "true");
  });
});
