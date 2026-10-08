import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Satori-safe favicon rendering of the refined geometric SK monogram with broken ring enclosure.
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
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
        >
          {/* Warm orange broken ring */}
          <path
            d="M 28 12 A 13 13 0 1 1 22 5"
            stroke="#ff8a4c"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Ivory S */}
          <path
            d="M 14.2 10.5 H 10.5 C 8.6 10.5 7.2 11.6 7.2 13.2 C 7.2 14.8 8.6 15.7 10.8 16.3 L 12 16.6 C 14.2 17.2 15.4 18.2 15.4 19.8 C 15.4 21.4 14 22.5 11.8 22.5 H 8"
            stroke="#faf6ee"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ivory K */}
          <path
            d="M 19 9.5 V 22.5 M 19 16 L 25.5 9.5 M 19 16 L 25.5 22.5"
            stroke="#faf6ee"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
