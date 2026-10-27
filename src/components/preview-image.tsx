import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/** Open Graph images are 1200×630, the size LinkedIn, Slack and most messengers expect. */
export const previewImageSize = { width: 1200, height: 630 };
export const previewImageContentType = "image/png";

interface PreviewImageProps {
  /** Small line above the heading. */
  kicker: string;
  heading: string;
  /** Text under the heading: a muted sentence, or a result in the green accent. */
  detail: string;
  tone: "muted" | "accent";
  /** Optional line at the bottom, under a rule. */
  footer?: string;
}

// Variant E's tokens (stone greys, one green accent).
const colours = {
  bg: "#fafaf9",
  ink: "#1c1917",
  muted: "#57534e",
  faint: "#a8a29e",
  line: "#e7e5e4",
  accent: "#15803d",
};

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

/** IBM Plex Sans as woff: ImageResponse cannot read the woff2 files `next/font` serves. */
async function plexSans() {
  const weights = [
    [400, "IBMPlexSans-Regular.woff"],
    [600, "IBMPlexSans-SemiBold.woff"],
    [700, "IBMPlexSans-Bold.woff"],
  ] as const;
  return Promise.all(
    weights.map(async ([weight, file]) => ({
      name: "IBM Plex Sans",
      data: await readFile(path.join(FONT_DIR, file)),
      weight,
      style: "normal" as const,
    })),
  );
}

/** The one link-preview template every page's `opengraph-image` renders. */
export async function previewImage({ kicker, heading, detail, tone, footer }: PreviewImageProps) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: footer ? "space-between" : "center",
        padding: "72px 80px",
        backgroundColor: colours.bg,
        borderTop: `16px solid ${colours.accent}`,
        color: colours.ink,
        fontFamily: "IBM Plex Sans",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, fontWeight: 600, color: colours.faint }}>{kicker}</div>
        <div
          style={{
            marginTop: 28,
            fontSize: heading.length > 32 ? 64 : 88,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {heading}
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: tone === "accent" ? 40 : 34,
            fontWeight: tone === "accent" ? 600 : 400,
            lineHeight: 1.4,
            color: tone === "accent" ? colours.accent : colours.muted,
          }}
        >
          {detail}
        </div>
      </div>
      {footer && (
        <div
          style={{
            display: "flex",
            paddingTop: 28,
            borderTop: `1px solid ${colours.line}`,
            fontSize: 30,
            fontWeight: 600,
          }}
        >
          {footer}
        </div>
      )}
    </div>,
    { ...previewImageSize, fonts: await plexSans() },
  );
}
