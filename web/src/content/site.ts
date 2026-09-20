/**
 * Site-wide constants. Contact-detail fallbacks are used only when the
 * live SiteSetting API field is empty or the fetch failed.
 *
 * Canonical public identity (2026-09):
 * - LinkedIn: /in/shahriyar-kh/
 * - GitHub: @Shahriyar-Kh
 * - public location: Pakistan
 *
 * Phone/WhatsApp are intentionally not exposed as public fallbacks.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shahriyarkhan.com").replace(
  /\/+$/,
  "",
);

export const OWNER_NAME = "Shahriyar Khan";
export const SITE_NAME = "Shahriyar Khan";

export const CONTACT_FALLBACKS = {
  email: "shahriyarkhanpk1@gmail.com",
  phone: "",
  location: "Pakistan",
} as const;

export const SOCIAL_LINKS = {
  github: "https://github.com/Shahriyar-Kh",
  linkedin: "https://www.linkedin.com/in/shahriyar-kh/",
  whatsapp: "",
} as const;

/** Used by lib/format.ts's isDistinctRepoUrl() to detect when a
 * project's github_url is just this generic profile link, not its own
 * repository. */
export const GITHUB_PROFILE_URL = SOCIAL_LINKS.github;

export const RESUME_PDF_PATH = "/resume/Shahriyar_Khan_Software_Engineer.pdf";

export function canonicalUrl(pathname: string): string {
  if (pathname === "/" || pathname === "") return `${SITE_URL}/`;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${path}`;
}
