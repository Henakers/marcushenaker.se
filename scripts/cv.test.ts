import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeAll, describe, expect, it } from "vitest";

// Checks the committed CV, the file Visitors download, not a fresh render.
const CV_PATH = "public/Marcus-Henaker-CV.pdf";

/** A4 in PDF points (1/72 inch). */
const A4 = { width: 595.28, height: 841.89 };

describe("the committed CV PDF", () => {
  let pages: { width: number; height: number; text: string }[];

  beforeAll(async () => {
    const data = new Uint8Array(fs.readFileSync(CV_PATH));
    const pdf = await getDocument({ data, useSystemFonts: false }).promise;
    pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
        .join("")
        .replace(/[ \t]+/g, " ");
      pages.push({ width, height, text });
    }
  });

  it("is one A4 page", () => {
    expect(pages).toHaveLength(1);
    expect(pages[0]!.width).toBeCloseTo(A4.width, 0);
    expect(pages[0]!.height).toBeCloseTo(A4.height, 0);
  });

  it("has selectable text with the name, title and contact details", () => {
    const { text } = pages[0]!;
    expect(text).toContain("Marcus Henåker");
    expect(text).toContain("Software Engineer");
    expect(text).toContain("marcushenaker@gmail.com");
    expect(text).toContain("marcushenaker.se");
    expect(text).toContain("Gothenburg area, Sweden");
  });

  it("uses the standard headings, in order", () => {
    const { text } = pages[0]!;
    const positions = ["Summary", "Experience", "Selected projects", "Skills", "Education"].map(
      (heading) => text.indexOf(heading),
    );
    expect(positions.every((p) => p > -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("links the case studies by their site URLs", () => {
    const { text } = pages[0]!;
    for (const slug of ["data-quality", "supplier-data-pipeline", "degree-project"]) {
      expect(text).toContain(`marcushenaker.se/work/${slug}`);
    }
  });

  it('ends with an "Updated <month year>" footer', () => {
    expect(pages[0]!.text.trim()).toMatch(
      /Updated (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/,
    );
  });
});
