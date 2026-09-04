import { NextResponse, type NextRequest } from "next/server";

/**
 * DOMAIN-01: www.shahriyarkhan.com must never serve content directly -
 * it always 301s to the apex (shahriyarkhan.com), preserving the exact
 * path and query string, so search engines converge on one canonical
 * host instead of indexing both (see next.config.ts's headers() /
 * lib/metadata.ts's canonical-URL comment for the same "one canonical
 * origin" rule applied to metadata). Every other host (the apex itself,
 * the workers.dev fallback kept live during cutover, localhost in dev)
 * passes through untouched.
 */
const WWW_HOST = "www.shahriyarkhan.com";
const APEX_HOST = "shahriyarkhan.com";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (host === WWW_HOST) {
    const url = new URL(request.url);
    url.host = APEX_HOST;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on every path except Next's own internal assets - a redirect
     * only needs to fire once per request, and re-matching /_next/*
     * would just add latency to every JS/CSS/font chunk for no reason.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
