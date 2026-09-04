/**
 * Site-wide constants. Contact-detail fallbacks are used only when the
 * live SiteSetting API field is empty or the fetch failed - see
 * components/contact/contact-details.tsx.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shahriyarkhan.vercel.app").replace(
  /\/+$/,
  "",
);

export const OWNER_NAME = "Shahriyar Khan";
export const SITE_NAME = "Shahriyar Khan";

export const CONTACT_FALLBACKS = {
  email: "shahriyarkhanpk1@gmail.com",
  phone: "+92 311 0924560",
  location: "Islamabad, Pakistan",
} as const;

export const SOCIAL_LINKS = {
  github: "https://github.com/Shahriyar-Kh",
  linkedin: "https://linkedin.com/in/shahriyarkhan786",
  whatsapp: "https://wa.me/923110924560",
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
