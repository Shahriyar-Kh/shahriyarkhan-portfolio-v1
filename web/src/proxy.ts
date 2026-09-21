import { NextResponse, type NextRequest } from "next/server";

const WWW_HOST = "www.shahriyarkhan.com";
const APEX_HOST = "shahriyarkhan.com";
const LEGACY_VERCEL_HOST = "shahriyarkhan.vercel.app";
const WORKERS_DEV_HOST = "shahriyarkhan-portfolio.feelwise.workers.dev";

const ALTERNATE_PUBLIC_HOSTS = new Set([
  WWW_HOST,
  LEGACY_VERCEL_HOST,
  WORKERS_DEV_HOST,
]);

function hostnameFromHostHeader(host: string) {
  return host.split(":", 1)[0]?.toLowerCase() ?? "";
}

function requestProtocol(request: NextRequest) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase();

  return forwardedProtocol || request.nextUrl.protocol.replace(":", "");
}

export function proxy(request: NextRequest) {
  const host = hostnameFromHostHeader(
    request.headers.get("host") ?? request.nextUrl.host,
  );
  const isAlternatePublicHost = ALTERNATE_PUBLIC_HOSTS.has(host);
  const isInsecureApexRequest =
    host === APEX_HOST && requestProtocol(request) === "http";

  if (isAlternatePublicHost || isInsecureApexRequest) {
    const url = new URL(request.url);
    url.hostname = APEX_HOST;
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
