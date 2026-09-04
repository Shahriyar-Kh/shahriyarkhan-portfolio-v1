// Local-only route smoke test - NOT wired into CI (see docs/rebuild/
// P01_ARCHITECTURE.md's "Quality gates" section for why: it needs a real
// running server, which the CI `web` job deliberately never starts,
// keeping the build offline-deterministic).
//
// Usage:
//   npm run build && npm run start   (in one terminal)
//   npm run smoke                    (in another; optionally SMOKE_BASE_URL=...)
//
// Run it twice per the definition of done: once with the real API base
// URL configured, once with NEXT_PUBLIC_API_BASE_URL pointed at an
// unreachable host - both must report zero failures, since every page
// must degrade to an honest EmptyState rather than a 500.

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  { path: "/", expect: 200 },
  { path: "/about", expect: 200 },
  { path: "/skills", expect: 200 },
  { path: "/work", expect: 200 },
  { path: "/experience", expect: 200 },
  { path: "/resume", expect: 200 },
  { path: "/services", expect: 200 },
  { path: "/contact", expect: 200 },
  { path: "/privacy", expect: 200 },
  { path: "/sitemap.xml", expect: 200 },
  { path: "/robots.txt", expect: 200 },
  { path: "/icon", expect: 200 },
  { path: "/opengraph-image", expect: 200 },
  // Deliberately unbuilt this phase - roadmap-only (see
  // P01_ROUTE_MIGRATION_PLAN.md). A 200 here would mean it was
  // accidentally half-built.
  { path: "/insights", expect: 404 },
  { path: "/this-route-does-not-exist", expect: 404 },
];

let failures = 0;

for (const route of ROUTES) {
  const url = `${BASE_URL}${route.path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const ok = res.status === route.expect;
    console.log(`${ok ? "PASS" : "FAIL"} ${res.status} (expected ${route.expect})  ${route.path}`);
    if (!ok) failures += 1;
  } catch (e) {
    console.log(`FAIL  ERROR  ${route.path}  ${e instanceof Error ? e.message : String(e)}`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} route(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${ROUTES.length} routes passed against ${BASE_URL}.`);
