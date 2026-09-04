import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgImageLayout } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgImageLayout
        eyebrow="Islamabad, Pakistan"
        title="Shahriyar Khan"
        subtitle="Python and Django engineering for REST APIs and deployed web products."
      />
    ),
    { ...size },
  );
}
