import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = join(__dirname, "..", "app");

/**
 * FINAL-DESIGN-01C-02-404-FIX guard. Root cause, confirmed by real
 * measurement across next dev, next start, and local Wrangler/vinext:
 * a root-level `app/loading.tsx` wraps every nested route (including
 * /work/[slug] and /services/[slug]) in an implicit Suspense boundary.
 * Next.js commits an HTTP 200 status for any streamed response - see
 * https://github.com/vercel/next.js/discussions/76501 - so a
 * `notFound()` call deep inside that boundary rendered the correct
 * branded 404 UI but the response still carried a 200 status, silently
 * telling crawlers and monitoring that a genuinely missing/unpublished
 * project or service exists. Removing the root loading.tsx (this repo
 * has no route that depends on it) let the full render - including the
 * notFound() decision - complete before any bytes are sent, so the real
 * status is set correctly. This guard fails if a root-level loading.tsx
 * is ever reintroduced, which would silently regress this exact fix.
 * A route-SPECIFIC loading.tsx (e.g. app/some-route/loading.tsx, which
 * only wraps that one route rather than the whole tree) is unaffected
 * by this guard and would need its own case-by-case verification if
 * ever added.
 */
describe("no-root-loading-boundary guard", () => {
  it("never reintroduces a root-level app/loading.tsx", () => {
    expect(existsSync(join(APP_ROOT, "loading.tsx"))).toBe(false);
  });
});
