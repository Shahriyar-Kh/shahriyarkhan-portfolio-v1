import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScrollTrigger } from "gsap/ScrollTrigger";

function fakeScrollTrigger() {
  return { refresh: vi.fn() } as unknown as typeof ScrollTrigger;
}

describe("initScrollTriggerRefresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve() },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls refresh once after document.fonts.ready resolves", async () => {
    const ScrollTrigger = fakeScrollTrigger();
    const { initScrollTriggerRefresh } = await import("@/lib/motion/refresh-on-settle");
    initScrollTriggerRefresh(ScrollTrigger);

    // document.fonts.ready is a real native Promise - fake timers only
    // intercept macrotasks (setTimeout/setInterval), so flushing the
    // microtask queue directly is enough to let its `.then()` run.
    await Promise.resolve();
    await Promise.resolve();

    expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
  });

  it("calls refresh once on window load, and not again on a second load event", async () => {
    const ScrollTrigger = fakeScrollTrigger();
    const { initScrollTriggerRefresh } = await import("@/lib/motion/refresh-on-settle");
    initScrollTriggerRefresh(ScrollTrigger);

    window.dispatchEvent(new Event("load"));
    expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("load"));
    expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
  });

  it("debounces a burst of resize events into exactly one refresh", async () => {
    const ScrollTrigger = fakeScrollTrigger();
    const { initScrollTriggerRefresh } = await import("@/lib/motion/refresh-on-settle");
    initScrollTriggerRefresh(ScrollTrigger);

    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    expect(ScrollTrigger.refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
  });

  it("wires listeners only once - a second init call is a no-op (module-scoped guard)", async () => {
    const ScrollTrigger = fakeScrollTrigger();
    const { initScrollTriggerRefresh } = await import("@/lib/motion/refresh-on-settle");
    initScrollTriggerRefresh(ScrollTrigger);
    initScrollTriggerRefresh(ScrollTrigger);

    window.dispatchEvent(new Event("load"));
    expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
  });
});
