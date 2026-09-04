import { describe, expect, it } from "vitest";
import { assertHomepageDataAvailable, type HomepageDataset } from "@/lib/api/homepage-availability";
import type { ApiResult } from "@/lib/api/errors";

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });
const networkErr = (): ApiResult<never> => ({ ok: false, error: { kind: "network", status: null, message: "Could not reach the content service." } });
const timeoutErr = (): ApiResult<never> => ({ ok: false, error: { kind: "timeout", status: null, message: "The content service took too long to respond." } });
const serverErr = (): ApiResult<never> => ({ ok: false, error: { kind: "http", status: 500, message: "The content service is temporarily unavailable." } });
const clientErr = (): ApiResult<never> => ({ ok: false, error: { kind: "http", status: 403, message: "Request failed with status 403." } });
const invalidResponseErr = (): ApiResult<never> => ({ ok: false, error: { kind: "invalid_response", status: 200, message: "Received an unreadable response." } });
const notFoundErr = (): ApiResult<never> => ({ ok: false, error: { kind: "not_found", status: 404, message: "Not found." } });

function datasets(overrides: Partial<Record<"projects" | "experiences" | "services" | "skills", ApiResult<unknown>>>): HomepageDataset[] {
  const base: Record<"projects" | "experiences" | "services" | "skills", ApiResult<unknown>> = {
    projects: ok([{ id: 1 }]),
    experiences: ok([{ id: 1 }]),
    services: ok([{ id: 1 }]),
    skills: ok([{ id: 1 }]),
  };
  const merged = { ...base, ...overrides };
  return (["projects", "experiences", "services", "skills"] as const).map((name) => ({ name, result: merged[name] }));
}

describe("assertHomepageDataAvailable", () => {
  it("does not throw when every dataset succeeded (real records)", () => {
    expect(() => assertHomepageDataAvailable(datasets({}))).not.toThrow();
  });

  it("does not throw for a legitimate empty response on every dataset - an empty array is not a failure", () => {
    expect(() =>
      assertHomepageDataAvailable(datasets({ projects: ok([]), experiences: ok([]), services: ok([]), skills: ok([]) })),
    ).not.toThrow();
  });

  it("does not throw when a dataset fails with a permanent 4xx - a real client-side bug should surface, not be masked", () => {
    expect(() => assertHomepageDataAvailable(datasets({ services: clientErr() }))).not.toThrow();
  });

  it("does not throw when a dataset fails with not_found - not a protected kind for a list endpoint", () => {
    expect(() => assertHomepageDataAvailable(datasets({ skills: notFoundErr() }))).not.toThrow();
  });

  // --- The seven required R6-FIX2 scenarios ---

  it("aborts on a projects-only transient (network) failure, even though the other three datasets succeeded", () => {
    expect(() => assertHomepageDataAvailable(datasets({ projects: networkErr() }))).toThrow(/"projects"/);
  });

  it("aborts on a services-only transient (timeout) failure, even though the other three datasets succeeded", () => {
    expect(() => assertHomepageDataAvailable(datasets({ services: timeoutErr() }))).toThrow(/"services"/);
  });

  it("aborts on a skills-only schema-invalid failure, even though the other three datasets succeeded", () => {
    expect(() => assertHomepageDataAvailable(datasets({ skills: invalidResponseErr() }))).toThrow(/"skills"/);
  });

  it("aborts on an experience-only 5xx failure, even though the other three datasets succeeded", () => {
    expect(() => assertHomepageDataAvailable(datasets({ experiences: serverErr() }))).toThrow(/"experiences"/);
  });

  it("distinguishes a legitimate empty success from a failure - never aborts on ok:true, data:[] for an ordinary dataset", () => {
    expect(() => assertHomepageDataAvailable(datasets({ projects: ok([]) }))).not.toThrow();
    expect(() => assertHomepageDataAvailable(datasets({ services: ok([]) }))).not.toThrow();
  });

  it("does not abort once a retryable failure has already resolved into a successful result (post-retry success)", () => {
    // apiGet's own retry loop resolves before this function ever sees the
    // result - by the time assertHomepageDataAvailable runs, a
    // successfully-recovered dataset is indistinguishable from one that
    // never failed at all. This is exactly that state.
    expect(() => assertHomepageDataAvailable(datasets({ projects: ok([{ id: 1 }, { id: 2 }]) }))).not.toThrow();
  });

  it("never permits a partial fallback page - a single failing dataset aborts the whole render, not just its own section", () => {
    // Three of four datasets are genuinely fine; only skills is down.
    // The old (R6-FIX) all-must-fail behavior would have let this render
    // as a "page with one broken section" and cached it. R6-FIX2 must
    // refuse the entire render so Next preserves the last fully-correct
    // page instead.
    const withOneFailure = datasets({ skills: networkErr() });
    expect(() => assertHomepageDataAvailable(withOneFailure)).toThrow();

    // Confirm this genuinely depends on aborting per-dataset, not merely
    // on "at least one failure exists" in some coarser sense - flipping
    // that one dataset back to healthy must make it pass again.
    const allHealthy = datasets({});
    expect(() => assertHomepageDataAvailable(allHealthy)).not.toThrow();
  });

  // --- requiredNonEmpty escape hatch (unused by any current homepage dataset) ---

  it("aborts on a legitimate empty response only when the dataset is explicitly marked requiredNonEmpty", () => {
    const withRequiredEmpty: HomepageDataset[] = [{ name: "projects", result: ok([]), requiredNonEmpty: true }];
    expect(() => assertHomepageDataAvailable(withRequiredEmpty)).toThrow(/"projects"/);
  });

  it("does not abort a requiredNonEmpty dataset that actually has records", () => {
    const withRequiredNonEmpty: HomepageDataset[] = [{ name: "projects", result: ok([{ id: 1 }]), requiredNonEmpty: true }];
    expect(() => assertHomepageDataAvailable(withRequiredNonEmpty)).not.toThrow();
  });

  it("does nothing for an empty dataset list", () => {
    expect(() => assertHomepageDataAvailable([])).not.toThrow();
  });
});
