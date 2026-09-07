// Real-HTTP regression check for the FINAL-DESIGN-01C-02-404-FIX: a
// genuinely missing/unpublished project or service slug must respond
// with a real HTTP 404 (not just render the branded 404 UI under a 200
// status - see src/test-guards/no-root-loading-boundary.test.ts for the
// root cause this guards against). Checks both GET and HEAD, for both
// /work/[slug] and /services/[slug], plus a sanity check that a real,
// valid slug still returns 200 with its real content.
//
// Usage:
//   npm run build && npm start   (or npm run build:vinext && npm run start:vinext)
//   npm run verify-404-status   (optionally SMOKE_BASE_URL=...)
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const CASES = [
  { path: "/work/yango-wing-fleet-digital-registration-fleet-management-platform", expect: 200, label: "valid project" },
  { path: `/work/verify-404-status-invalid-${Date.now()}`, expect: 404, label: "invalid project" },
  { path: "/services/website-development", expect: 200, label: "valid service" },
  { path: `/services/verify-404-status-invalid-${Date.now()}`, expect: 404, label: "invalid service" },
  { path: "/this-route-genuinely-does-not-exist-anywhere", expect: 404, label: "unknown top-level route (router 404)" },
];

async function check(path, method) {
  const res = await fetch(`${BASE_URL}${path}`, { method, redirect: "manual" });
  return res.status;
}

async function main() {
  let allPass = true;
  for (const { path, expect: expected, label } of CASES) {
    for (const method of ["GET", "HEAD"]) {
      const status = await check(path, method);
      const pass = status === expected;
      if (!pass) allPass = false;
      console.log(`[${method}] ${label} (${path}): expected ${expected}, got ${status} -> ${pass ? "PASS" : "FAIL"}`);
    }
  }
  console.log(allPass ? "\nALL PASS" : "\nSOME FAILED");
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
