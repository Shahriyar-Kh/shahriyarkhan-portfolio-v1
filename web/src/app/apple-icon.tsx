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
        <div style={{ position: "relative", width: 100, height: 70, display: "flex" }}>
          <div style={{ position: "absolute", top: 32, left: 0, width: 70, height: 10, background: "#b8420f" }} />
          <div
            style={{
              position: "absolute",
              top: 15,
              right: 0,
              width: 40,
              height: 40,
              borderRadius: 40,
              background: "#ff8a4c",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
