import { ImageResponse } from "next/og";
import { getServiceBySlug } from "@/lib/api";
import { OG_CONTENT_TYPE, OG_SIZE, OgImageLayout } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const result = await getServiceBySlug(slug);
  const title = result.ok ? result.data.title : "Services";
  const subtitle = result.ok ? result.data.description : undefined;

  return new ImageResponse(<OgImageLayout eyebrow="Service" title={title} subtitle={subtitle} />, { ...size });
}
