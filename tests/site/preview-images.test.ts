import { describe, expect, inject, it } from "vitest";
import { getContent } from "@/content";

const baseUrl = inject("baseUrl");

const pages = [
  "/",
  ...getContent()
    .caseStudies()
    .map(({ slug }) => `/work/${slug}`),
];

/** The page's `og:image` URL, fetched from the test server whatever origin the tag names. */
async function previewImageUrl(page: string): Promise<string> {
  const html = await (await fetch(`${baseUrl}${page}`)).text();
  const match = html.match(/<meta property="og:image" content="([^"]+)"/);
  expect(match, `${page} has an og:image meta tag`).not.toBeNull();
  const url = new URL(match![1]!.replaceAll("&amp;", "&"));
  return `${baseUrl}${url.pathname}${url.search}`;
}

/** Width and height from a PNG's IHDR chunk, which always starts at byte 16. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("link-preview images", () => {
  it.each(pages)("%s points og:image at a 1200×630 PNG of its own", async (page) => {
    const imageUrl = await previewImageUrl(page);
    const expectedPath = page === "/" ? "/opengraph-image" : `${page}/opengraph-image`;
    expect(new URL(imageUrl).pathname).toBe(expectedPath);

    const response = await fetch(imageUrl);
    const bytes = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(pngSize(bytes)).toEqual({ width: 1200, height: 630 });
  });

  it.each(pages)("%s has its preview image rendered at build time", async (page) => {
    const response = await fetch(await previewImageUrl(page));

    // Next.js marks responses served from the build's prerendered output as cache hits.
    expect(response.headers.get("x-nextjs-cache")).toBe("HIT");
  });
});
