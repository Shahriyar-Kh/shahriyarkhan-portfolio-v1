import { ImageResponse } from "next/og";
import { getProject } from "@/lib/api";
import { OG_CONTENT_TYPE, OG_SIZE, OgImageLayout } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Never throws - a fetch failure falls back to a site-default
 * composition rather than a broken image, since a throwing OG route
 * produces a permanently-broken share-card image cached by every
 * platform that has already scraped it.
 */
export default async function Image({ params }: Props) {
  const { slug } = await params;
  const result = await getProject(slug);
  const title = result.ok ? result.data.title : "Selected Work";
  const subtitle = result.ok ? result.data.ai_summary || result.data.description : undefined;

  return new ImageResponse(<OgImageLayout eyebrow="Case study" title={title} subtitle={subtitle} />, { ...size });
}
