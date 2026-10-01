import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Satori-safe favicon rendering of the same geometric SK monogram used by the live SVG.
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
        <div style={{ position: "relative", width: 24, height: 18, display: "flex", gap: 4 }}>
          <div style={{ position: "relative", width: 9, height: 18, display: "flex", color: "#faf6ee" }}>
            <span style={{ position: "absolute", top: 0, left: 0, width: 9, height: 2, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 0, left: 0, width: 2, height: 9, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 8, left: 0, width: 9, height: 2, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 9, left: 7, width: 2, height: 9, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 16, left: 0, width: 9, height: 2, background: "#faf6ee", display: "flex" }} />
          </div>
          <div style={{ position: "relative", width: 11, height: 18, display: "flex", color: "#ff8a4c" }}>
            <span style={{ position: "absolute", top: 0, left: 0, width: 2, height: 18, background: "#ff8a4c", display: "flex" }} />
            <span style={{ position: "absolute", top: 8, left: 1, width: 12, height: 2, background: "#ff8a4c", transform: "rotate(-38deg)", transformOrigin: "left center", display: "flex" }} />
            <span style={{ position: "absolute", top: 8, left: 1, width: 12, height: 2, background: "#ff8a4c", transform: "rotate(38deg)", transformOrigin: "left center", display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
