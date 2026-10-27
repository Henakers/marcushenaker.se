// IBM Plex Sans as woff files, shared by the preview images and the CV. ImageResponse cannot read
// the woff2 files `next/font` serves, so these are committed under assets/fonts.
//
// Plain TypeScript with no path aliases: `scripts/build-cv.ts` imports it under Node directly.

/** The font directory, relative to the repo root. */
export const PLEX_SANS_DIR = "assets/fonts";

/** One file per weight the preview images and the CV use. */
export const PLEX_SANS_FILES = [
  { weight: 400, file: "IBMPlexSans-Regular.woff" },
  { weight: 600, file: "IBMPlexSans-SemiBold.woff" },
  { weight: 700, file: "IBMPlexSans-Bold.woff" },
] as const;
