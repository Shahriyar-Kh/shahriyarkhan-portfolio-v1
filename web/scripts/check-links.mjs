// Local-only broken-link check - crawls same-origin links reachable from
// the given start pages. Not wired into CI for the same reason as
// smoke-routes.mjs (needs a real running server). Usage:
//   npm run build && npm run start
//   npm run check-links

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const START_PATHS = ["/", "/about", "/work", "/services", "/experience", "/resume", "/contact", "/privacy"];

const HREF_RE = /href="([^"#]+)"/g;

function isSameOriginPath(href) {
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href.startsWith(BASE_URL);
  }
  return href.startsWith("/");
}

function toPath(href) {
  if (href.startsWith(BASE_URL)) return href.slice(BASE_URL.length) || "/";
  return href;
}

async function extractLinks(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) return { links: [], status: res.status };
  const html = await res.text();
  const links = new Set();
  for (const match of html.matchAll(HREF_RE)) {
    const href = match[1];
    if (isSameOriginPath(href)) links.add(toPath(href));
  }
  return { links: Array.from(links), status: res.status };
}

const visited = new Set();
const queue = [...START_PATHS];
const broken = [];

while (queue.length > 0) {
  const path = queue.shift();
  if (visited.has(path)) continue;
  visited.add(path);

  const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  const ok = res.status >= 200 && res.status < 400;
  console.log(`${ok ? "PASS" : "FAIL"} ${res.status}  ${path}`);
  if (!ok) {
    broken.push({ path, status: res.status });
    continue;
  }

  if (START_PATHS.includes(path)) {
    const { links } = await extractLinks(path);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }
  }
}

if (broken.length > 0) {
  console.error(`\n${broken.length} broken link(s):`);
  for (const b of broken) console.error(`  ${b.status}  ${b.path}`);
  process.exit(1);
}

console.log(`\nChecked ${visited.size} same-origin URLs from ${BASE_URL} - no broken links found.`);
