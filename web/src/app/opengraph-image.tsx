import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgImageLayout } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgImageLayout
        eyebrow="Software Engineer · Backend Engineer"
        title="Shahriyar Khan"
        subtitle="Python/Django backend engineering · REST APIs · PostgreSQL · React/Next.js"
      />
    ),
    { ...size },
  );
}
