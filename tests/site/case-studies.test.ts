import { describe, expect, inject, it } from "vitest";
import { getContent } from "@/content";

const baseUrl = inject("baseUrl");
const caseStudies = getContent().caseStudies();

describe("case-study pages", () => {
  it("has Case studies to check", () => {
    expect(caseStudies.length).toBeGreaterThan(0);
  });

  it.each(caseStudies.map((study) => [study.slug, study.title]))(
    "/work/%s returns 200 with its title, links to the next Case study and home",
    async (slug, title) => {
      const next = getContent().caseStudy(slug)!.next;

      const response = await fetch(`${baseUrl}/work/${slug}`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toMatch(new RegExp(`<h1[^>]*>${title}</h1>`));
      expect(html).toContain(`href="/work/${next.slug}"`);
      expect(html).toContain('href="/"');
    },
  );

  it("returns 404 for an unknown slug", async () => {
    const response = await fetch(`${baseUrl}/work/no-such-study`);

    expect(response.status).toBe(404);
  });
});
