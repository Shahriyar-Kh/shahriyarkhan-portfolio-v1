import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Read directly from process.env (not the NEXT_PUBLIC_ client bundle) since
// this file runs in Node at build/dev time, not in the browser.
function apiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const API_ORIGIN = apiOrigin();

// Conservative 'self' + 'unsafe-inline' CSP, no nonce/middleware - see
// docs/rebuild/P01_ARCHITECTURE.md for the full reasoning. A nonce would
// require middleware.ts minting a per-request value, which forces every
// route to render dynamically - destroying the ISR/generateStaticParams
// strategy that is this site's entire cold-start-resilience story. The
// site renders zero untrusted HTML (every API string goes through JSX
// text interpolation, which React escapes; the only dangerouslySetInnerHTML
// is the JSON-LD block). style-src 'unsafe-inline' is unavoidable
// regardless, since Next injects inline <style> and the system map sets an
// inline custom property - so a nonce would only narrow script-src, for a
// site with no injection surface to exploit there.
function buildCsp(): string {
  const connectSrc = ["'self'"];
  const imgSrc = ["'self'", "data:", "blob:", "https://res.cloudinary.com"];
  if (API_ORIGIN) {
    connectSrc.push(API_ORIGIN);
    imgSrc.push(API_ORIGIN);
  }
  if (isDev) connectSrc.push("ws:");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": isDev
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
      : ["'self'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": imgSrc,
    "font-src": ["'self'", "data:"],
    "connect-src": connectSrc,
    "manifest-src": ["'self'"],
  };

  const serialized = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  return isDev ? serialized : `${serialized}; upgrade-insecure-requests`;
}

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
    pathname: "/**",
  },
];

if (API_ORIGIN) {
  const url = new URL(API_ORIGIN);
  remotePatterns.push({
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    port: url.port || undefined,
    pathname: "/media/**",
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns,
    // Next's default deviceSizes/imageSizes lists don't include 1280 -
    // the fixed capture width scripts/capture-project-screenshots.mjs
    // uses for the homepage's local project screenshots
    // (public/images/projects/*.webp). Without this, the image
    // optimizer rejects those images outright ("w" parameter of 1280 is
    // not allowed) and they silently fail to load at runtime.
    deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 3840],
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: buildCsp() },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      ...(isDev
        ? []
        : [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]),
    ];
    return [
      // Two source patterns for the same header block, not one - vinext's
      // (Cloudflare Workers deployment) reimplementation of Next's
      // `:path*` matcher was confirmed, by directly testing the built
      // Worker's actual response headers, not to include the bare root
      // path the way Next.js's own matcher does (`/about` correctly got
      // every header below; `/` got none). An explicit `source: "/"` rule
      // closes that gap without depending on adapter-specific matcher
      // semantics. Harmless duplication under real Next.js (both rules
      // simply match and merge identically).
      {
        source: "/",
        headers: securityHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Owner judgment call #11: noindex the PDF itself so the branded
        // query ("Shahriyar Khan resume") lands on the /resume HTML page,
        // not a bare file.
        source: "/resume/:path*.pdf",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;
