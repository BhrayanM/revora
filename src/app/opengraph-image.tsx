import { ImageResponse } from "next/og";

export const alt = "Revora — AI Revenue Automation Platform";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#090909",
        color: "#fafaf7",
        display: "flex",
        height: "100%",
        padding: "76px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(250, 250, 247, 0.16)",
          borderRadius: "34px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "54px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: "20px" }}>
          <svg width="58" height="58" viewBox="0 0 64 64" fill="none">
            <path
              d="M10 51 32 10l22 41H10Z"
              stroke="#fafaf7"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m24.5 38 7.5-14 7.5 14M43 19h8v8m0-8-11 11"
              stroke="#fafaf7"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-2px" }}
          >
            Revora
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <span
            style={{
              color: "#b8b8b2",
              fontSize: 26,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            AI Revenue Automation Platform
          </span>
          <span
            style={{
              fontSize: 76,
              fontWeight: 600,
              letterSpacing: "-4px",
              lineHeight: 1.05,
            }}
          >
            Turn every qualified signal into momentum.
          </span>
        </div>
      </div>
    </div>,
    size,
  );
}
