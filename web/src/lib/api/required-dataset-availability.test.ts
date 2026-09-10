import { describe, expect, it } from "vitest";
import { assertRequiredDatasetsAvailable, type RequiredDataset } from "@/lib/api/required-dataset-availability";
import type { ApiResult } from "@/lib/api/errors";

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });
const networkErr = (): ApiResult<never> => ({ ok: false, error: { kind: "network", status: null, message: "Could not reach the content service." } });
const timeoutErr = (): ApiResult<never> => ({ ok: false, error: { kind: "timeout", status: null, message: "The content service took too long to respond." } });
const serverErr = (): ApiResult<never> => ({ ok: false, error: { kind: "http", status: 500, message: "The content service is temporarily unavailable." } });
const clientErr = (): ApiResult<never> => ({ ok: false, error: { kind: "http", status: 403, message: "Request failed with status 403." } });
const invalidResponseErr = (): ApiResult<never> => ({ ok: false, error: { kind: "invalid_response", status: 200, message: "Received an unreadable response." } });
const notFoundErr = (): ApiResult<never> => ({ ok: false, error: { kind: "not_found", status: 404, message: "Not found." } });

function homepageDatasets(overrides: Partial<Record<"projects" | "experiences" | "services" | "skills", ApiResult<unknown>>>): RequiredDataset[] {
  const base: Record<"projects" | "experiences" | "services" | "skills", ApiResult<unknown>> = {
    projects: ok([{ id: 1 }]),
    experiences: ok([{ id: 1 }]),
    services: ok([{ id: 1 }]),
    skills: ok([{ id: 1 }]),
  };
  const merged = { ...base, ...overrides };
  return (["projects", "experiences", "services", "skills"] as const).map((name) => ({ name, result: merged[name] }));
}

describe("assertRequiredDatasetsAvailable", () => {
  it("does not throw when every dataset succeeded (real records)", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({}))).not.toThrow();
  });

  it("does not throw for a legitimate empty response on every dataset - an empty array is not a failure", () => {
    expect(() =>
      assertRequiredDatasetsAvailable(homepageDatasets({ projects: ok([]), experiences: ok([]), services: ok([]), skills: ok([]) })),
    ).not.toThrow();
  });

  it("does not throw when a dataset fails with a permanent 4xx - a real client-side bug should surface, not be masked", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ services: clientErr() }))).not.toThrow();
  });

  it("does not throw when a dataset fails with not_found - not a protected kind for a list endpoint", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ skills: notFoundErr() }))).not.toThrow();
  });

  // --- The seven required R6-FIX2 scenarios (homepage's own 4 datasets) ---

  it("aborts on a projects-only transient (network) failure, even though the other three datasets succeeded", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ projects: networkErr() }))).toThrow(/"projects"/);
  });

  it("aborts on a services-only transient (timeout) failure, even though the other three datasets succeeded", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ services: timeoutErr() }))).toThrow(/"services"/);
  });

  it("aborts on a skills-only schema-invalid failure, even though the other three datasets succeeded", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ skills: invalidResponseErr() }))).toThrow(/"skills"/);
  });

  it("aborts on an experience-only 5xx failure, even though the other three datasets succeeded", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ experiences: serverErr() }))).toThrow(/"experiences"/);
  });

  it("distinguishes a legitimate empty success from a failure - never aborts on ok:true, data:[] for an ordinary dataset", () => {
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ projects: ok([]) }))).not.toThrow();
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ services: ok([]) }))).not.toThrow();
  });

  it("does not abort once a retryable failure has already resolved into a successful result (post-retry success)", () => {
    // apiGet's own retry loop resolves before this function ever sees the
    // result - by the time assertRequiredDatasetsAvailable runs, a
    // successfully-recovered dataset is indistinguishable from one that
    // never failed at all. This is exactly that state.
    expect(() => assertRequiredDatasetsAvailable(homepageDatasets({ projects: ok([{ id: 1 }, { id: 2 }]) }))).not.toThrow();
  });

  it("never permits a partial fallback page - a single failing dataset aborts the whole render, not just its own section", () => {
    // Three of four datasets are genuinely fine; only skills is down.
    // The old (R6-FIX) all-must-fail behavior would have let this render
    // as a "page with one broken section" and cached it. R6-FIX2 must
    // refuse the entire render so Next preserves the last fully-correct
    // page instead.
    const withOneFailure = homepageDatasets({ skills: networkErr() });
    expect(() => assertRequiredDatasetsAvailable(withOneFailure)).toThrow();

    // Confirm this genuinely depends on aborting per-dataset, not merely
    // on "at least one failure exists" in some coarser sense - flipping
    // that one dataset back to healthy must make it pass again.
    const allHealthy = homepageDatasets({});
    expect(() => assertRequiredDatasetsAvailable(allHealthy)).not.toThrow();
  });

  // --- requiredNonEmpty escape hatch (unused by any current caller) ---

  it("aborts on a legitimate empty response only when the dataset is explicitly marked requiredNonEmpty", () => {
    const withRequiredEmpty: RequiredDataset[] = [{ name: "projects", result: ok([]), requiredNonEmpty: true }];
    expect(() => assertRequiredDatasetsAvailable(withRequiredEmpty)).toThrow(/"projects"/);
  });

  it("does not abort a requiredNonEmpty dataset that actually has records", () => {
    const withRequiredNonEmpty: RequiredDataset[] = [{ name: "projects", result: ok([{ id: 1 }]), requiredNonEmpty: true }];
    expect(() => assertRequiredDatasetsAvailable(withRequiredNonEmpty)).not.toThrow();
  });

  it("does nothing for an empty dataset list", () => {
    expect(() => assertRequiredDatasetsAvailable([])).not.toThrow();
  });

  // --- EXPERIENCE-DATA-01: the /experience page's own two-dataset call
  // (experiences + education), modeled directly rather than only
  // inferred from the generic homepage cases above. ---

  describe("Experience page usage (experiences + education, both required and independent)", () => {
    function experiencePageDatasets(overrides: Partial<Record<"experiences" | "education", ApiResult<unknown>>>): RequiredDataset[] {
      const base: Record<"experiences" | "education", ApiResult<unknown>> = {
        experiences: ok([{ id: 1 }, { id: 2 }, { id: 3 }]),
        education: ok([{ id: 1 }]),
      };
      const merged = { ...base, ...overrides };
      return (["experiences", "education"] as const).map((name) => ({ name, result: merged[name] }));
    }

    it("renders normally when both real Experience and Education datasets succeed", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({}))).not.toThrow();
    });

    it("aborts on an Experience-only transient (network) failure, even though Education succeeded", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ experiences: networkErr() }))).toThrow(/"experiences"/);
    });

    it("aborts on an Education-only transient (network) failure, even though Experience succeeded", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ education: networkErr() }))).toThrow(/"education"/);
    });

    it("aborts on an Experience-only timeout - the cold-start signature", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ experiences: timeoutErr() }))).toThrow(/"experiences"/);
    });

    it("aborts on an Education-only timeout - the cold-start signature", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ education: timeoutErr() }))).toThrow(/"education"/);
    });

    it("aborts on an Experience-only 5xx response", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ experiences: serverErr() }))).toThrow(/"experiences"/);
    });

    it("aborts on an Education-only 5xx response", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ education: serverErr() }))).toThrow(/"education"/);
    });

    it("aborts on an Experience-only schema-invalid (2xx but unparseable) response", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ experiences: invalidResponseErr() }))).toThrow(/"experiences"/);
    });

    it("aborts on an Education-only schema-invalid (2xx but unparseable) response", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ education: invalidResponseErr() }))).toThrow(/"education"/);
    });

    it("never aborts on a legitimate empty Experience response - zero real roles is a valid life-cycle state, not an error", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ experiences: ok([]) }))).not.toThrow();
    });

    it("never aborts on a legitimate empty Education response - zero real records is a valid life-cycle state, not an error", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ education: ok([]) }))).not.toThrow();
    });

    it("never aborts on a permanent 4xx from either dataset - a real client-side bug should surface, not be masked behind stale data forever", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ experiences: clientErr() }))).not.toThrow();
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ education: clientErr() }))).not.toThrow();
    });

    it("does not abort once a retryable Experience failure has already resolved into a successful retry result", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ experiences: ok([{ id: 1 }, { id: 2 }, { id: 3 }]) }))).not.toThrow();
    });

    it("recovers cleanly once a previously-failing dataset flips back to healthy - proves per-call independence, not sticky state", () => {
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({ education: networkErr() }))).toThrow();
      expect(() => assertRequiredDatasetsAvailable(experiencePageDatasets({}))).not.toThrow();
    });
  });
});
