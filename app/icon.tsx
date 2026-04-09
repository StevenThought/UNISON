import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#08080A",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "2px",
        }}
      >
        {/* Tiny MIKE — back view pixel art */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Hair/head */}
          <div style={{ width: 10, height: 5, background: "#5A3A1A", borderRadius: "5px 5px 0 0" }} />
          {/* Body */}
          <div style={{ width: 12, height: 8, background: "#4A5A6A", borderRadius: "1px" }} />
          {/* Legs */}
          <div style={{ display: "flex", gap: "2px" }}>
            <div style={{ width: 4, height: 6, background: "#2A2A2A" }} />
            <div style={{ width: 4, height: 6, background: "#2A2A2A" }} />
          </div>
          {/* Feet */}
          <div style={{ display: "flex", gap: "1px" }}>
            <div style={{ width: 5, height: 2, background: "#1A1A1A" }} />
            <div style={{ width: 5, height: 2, background: "#1A1A1A" }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
