import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import { toHaveNoViolations } from "vitest-axe/dist/matchers";

// Real gsap/ScrollTrigger do genuine DOM measurement and scroll-listener
// setup on every gsap.context()/ScrollTrigger.create() call - correct in
// a browser, but expensive multiplied across every GSAP-driven section on
// a full HomeView render, and unnecessary for component tests that only
// care that the right DOM structure exists (see
// lib/motion/use-scroll-reveal.test.tsx for the one test that verifies
// the *hook's own* context/cleanup wiring, which mocks the
// lib/motion/gsap-client wrapper directly and is unaffected by this).
// This mock keeps every gsap.* call a harmless no-op while still
// executing `gsap.context`'s callback synchronously, so component setup
// code still runs (and still exercises its own defensive branches, e.g.
// hero.tsx's getTotalLength() try/catch) without touching real timing,
// ScrollTrigger, or layout APIs jsdom doesn't implement anyway.
function chainable(): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const method of ["to", "from", "fromTo", "set", "call", "add", "addLabel", "eventCallback"]) {
    obj[method] = () => obj;
  }
  return obj;
}

vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: () => {},
    context: (fn: () => void) => {
      fn();
      return { revert: () => {}, kill: () => {}, add: () => {} };
    },
    timeline: () => chainable(),
    to: () => chainable(),
    from: () => chainable(),
    fromTo: () => chainable(),
    set: () => undefined,
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { create: () => ({ kill: () => {} }), getAll: () => [], refresh: () => {} },
}));

// vitest-axe@0.1.0 ships two packaging bugs (confirmed by inspection of
// node_modules, not a resolution/config issue on this end): its
// "vitest-axe/extend-expect" entry is an empty file, and its
// "vitest-axe/matchers" root re-export uses `export type *`, which makes
// the real runtime export type-only as far as tsc is concerned. Importing
// straight from "vitest-axe/dist/matchers" (which exports the function as
// a real value) and extending expect() here sidesteps both.
expect.extend({ toHaveNoViolations });

afterEach(() => {
  cleanup();
});

// jsdom implements neither API. Every component using
// usePrefersReducedMotion() (matchMedia) or an IntersectionObserver
// (Reveal, SystemMapActivation) would otherwise throw in every render
// test, not just the ones specifically testing motion behavior.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

if (!("IntersectionObserver" in window)) {
  class MockIntersectionObserver implements IntersectionObserver {
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
  // @ts-expect-error - test-only polyfill, not a spec-complete implementation
  window.IntersectionObserver = MockIntersectionObserver;
}

// jsdom implements neither ResizeObserver. site-header.tsx uses one to
// publish the header's real height as --header-h; without this, every
// render test would silently skip that effect (it already guards with
// `typeof ResizeObserver === "undefined"`) rather than throwing, but a
// dedicated test for the height-publishing behavior needs a real
// (mock) observer to invoke its callback against.
if (!("ResizeObserver" in window)) {
  class MockResizeObserver implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error - test-only polyfill, not a spec-complete implementation
  window.ResizeObserver = MockResizeObserver;
}
