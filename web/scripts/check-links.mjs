// Local-only broken-link check - crawls same-origin links reachable from
// the given start pages. Not wired into CI for the same reason as
// smoke-routes.mjs (needs a real running server). Usage:
//   npm run build && npm run start
//   npm run check-links

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const START_PATHS = ["/", "/about", "/skills", "/work", "/services", "/experience", "/resume", "/contact", "/privacy"];

const ANCHOR_HREF_RE = /<a\b[^>]*\bhref="([^"]*)"/gi;
const CANONICAL_RE = /<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"/i;
const CANONICAL_ORIGIN = "https://shahriyarkhan.com";

function malformedHrefReason(href) {
  if (href === "&") return 'href is the invalid relative path "&"';
  if (href.startsWith(":")) return "href starts with a generated-id colon";
  if (/^https?:\/\/(?:www\.)?shahriyarkhan\.com(?::\d+)?/i.test(href)) {
    if (href.startsWith("http://")) return "internal href downgrades to HTTP";
    if (/^https:\/\/www\./i.test(href)) return "internal href uses the non-canonical www host";
  }
  if (/^\/[^\s?#]*:[a-z0-9]{5,}(?::\d+)?(?:[?#]|$)/i.test(href)) {
    return "internal href ends with a generated-id-style path suffix";
  }
  return null;
}

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

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

async function extractLinks(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) return { links: [], malformed: [], canonical: null, status: res.status };
  const html = await res.text();
  const links = new Set();
  const malformed = [];
  for (const match of html.matchAll(ANCHOR_HREF_RE)) {
    const href = decodeHtmlAttribute(match[1]);
    const reason = malformedHrefReason(href);
    if (reason) malformed.push({ href, reason });
    if (href.startsWith("#") || href === "") continue;
    if (isSameOriginPath(href)) links.add(toPath(href));
  }
  return {
    links: Array.from(links),
    malformed,
    canonical: html.match(CANONICAL_RE)?.[1] ?? null,
    status: res.status,
  };
}

function expectedCanonical(path) {
  const parsed = new URL(path, CANONICAL_ORIGIN);
  if (parsed.pathname === "/") return CANONICAL_ORIGIN;
  return `${CANONICAL_ORIGIN}${parsed.pathname}`;
}

const visited = new Set();
const queue = [...START_PATHS];
const broken = [];
const malformed = [];
const canonicalFailures = [];

while (queue.length > 0) {
  const path = queue.shift();
  if (visited.has(path)) continue;
  visited.add(path);

  const page = await extractLinks(path);
  const ok = page.status >= 200 && page.status < 400;
  console.log(`${ok ? "PASS" : "FAIL"} ${page.status}  ${path}`);
  if (!ok) {
    broken.push({ path, status: page.status });
    continue;
  }

  for (const issue of page.malformed) malformed.push({ path, ...issue });

  const expected = expectedCanonical(path);
  if (page.canonical !== expected) {
    canonicalFailures.push({ path, actual: page.canonical, expected });
  }

  for (const link of page.links) {
    if (!visited.has(link)) queue.push(link);
  }
}

if (broken.length > 0) {
  console.error(`\n${broken.length} broken link(s):`);
  for (const b of broken) console.error(`  ${b.status}  ${b.path}`);
}

if (malformed.length > 0) {
  console.error(`\n${malformed.length} malformed public href(s):`);
  for (const issue of malformed) console.error(`  ${issue.path}: ${issue.href} - ${issue.reason}`);
}

if (canonicalFailures.length > 0) {
  console.error(`\n${canonicalFailures.length} canonical mismatch(es):`);
  for (const issue of canonicalFailures) {
    console.error(`  ${issue.path}: expected ${issue.expected}, got ${issue.actual ?? "<missing>"}`);
  }
}

if (broken.length > 0 || malformed.length > 0 || canonicalFailures.length > 0) process.exit(1);

console.log(`\nChecked ${visited.size} same-origin URLs from ${BASE_URL} - no broken links, malformed hrefs, or canonical mismatches found.`);
