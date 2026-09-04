import type { Metadata } from "next";
import type { PageSeo } from "@/lib/api/types";
import { SITE_NAME, canonicalUrl } from "@/content/site";

export function absoluteUrl(pathname: string): string {
  return canonicalUrl(pathname);
}

export interface MetadataInput {
  pathname: string;
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string | null;
}

/**
 * The single place Metadata objects are built, so every route gets
 * identical title-template behavior, canonical/OG/Twitter wiring, and
 * (per the security/SEO plan) a canonical that is NEVER shahriyarkhan.dev
 * and never a Vercel preview host - it always comes from SITE_URL.
 */
export function buildMetadata({ pathname, title, description, keywords, ogImage }: MetadataInput): Metadata {
  const url = absoluteUrl(pathname);
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export interface MergePageSeoDefaults {
  title: string;
  description: string;
  keywords?: string;
}

/**
 * Prefers a non-empty PageSEO field over the code-level default, but
 * never lets an empty string (PageSEO fields are blank=True, so empty
 * strings are common) blank out a good default.
 */
export function mergePageSeo(defaults: MergePageSeoDefaults, pageSeo: PageSeo | null): MergePageSeoDefaults {
  if (!pageSeo) return defaults;
  const nonEmpty = (value: string | undefined, fallback: string | undefined) =>
    value && value.trim().length > 0 ? value : fallback;

  return {
    title: nonEmpty(pageSeo.title_tag, defaults.title) ?? defaults.title,
    description: nonEmpty(pageSeo.meta_description, defaults.description) ?? defaults.description,
    keywords: nonEmpty(pageSeo.keywords, defaults.keywords),
  };
}
