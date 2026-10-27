import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The "MH" monogram from `icon.svg`, rendered as the PNG that home-screen shortcuts need. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafaf9",
        color: "#15803d",
        fontSize: 84,
        fontWeight: 700,
        letterSpacing: -3,
      }}
    >
      MH
    </div>,
    size,
  );
}
