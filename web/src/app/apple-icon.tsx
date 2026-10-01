import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <div style={{ position: "relative", width: 112, height: 84, display: "flex", gap: 18 }}>
          <div style={{ position: "relative", width: 42, height: 84, display: "flex", color: "#faf6ee" }}>
            <span style={{ position: "absolute", top: 0, left: 0, width: 42, height: 9, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 0, left: 0, width: 9, height: 42, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 37, left: 0, width: 42, height: 9, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 42, left: 33, width: 9, height: 42, background: "#faf6ee", display: "flex" }} />
            <span style={{ position: "absolute", top: 75, left: 0, width: 42, height: 9, background: "#faf6ee", display: "flex" }} />
          </div>
          <div style={{ position: "relative", width: 52, height: 84, display: "flex", color: "#ff8a4c" }}>
            <span style={{ position: "absolute", top: 0, left: 0, width: 9, height: 84, background: "#ff8a4c", display: "flex" }} />
            <span style={{ position: "absolute", top: 37, left: 4, width: 52, height: 9, background: "#ff8a4c", transform: "rotate(-38deg)", transformOrigin: "left center", display: "flex" }} />
            <span style={{ position: "absolute", top: 37, left: 4, width: 52, height: 9, background: "#ff8a4c", transform: "rotate(38deg)", transformOrigin: "left center", display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
