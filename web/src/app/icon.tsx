import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// The SK signature mark: an orange node riding one drawn signal line on
// an ink field - see components/motif/sk-mark.tsx for the live SVG
// version used across the app. Rebuilt with plain divs here (Satori-safe
// - no oklch(), no external assets, no next/font).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17130f",
        }}
      >
        <div style={{ position: "relative", width: 20, height: 14, display: "flex" }}>
          <div style={{ position: "absolute", top: 6, left: 0, width: 14, height: 2, background: "#b8420f" }} />
          <div
            style={{
              position: "absolute",
              top: 3,
              right: 0,
              width: 8,
              height: 8,
              borderRadius: 8,
              background: "#ff8a4c",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
