import { describe, expect, inject, it } from "vitest";
import { getContent } from "@/content";

const baseUrl = inject("baseUrl");
const caseStudies = getContent().caseStudies();

async function homeHtml() {
  const response = await fetch(`${baseUrl}/`);
  return { response, html: await response.text() };
}

describe("home page", () => {
  it("returns 200 with the Title in an en-GB document", async () => {
    const { response, html } = await homeHtml();

    expect(response.status).toBe(200);
    expect(html).toContain('<html lang="en-GB"');
    expect(html).toMatch(/<h1[^>]*>Software Engineer<\/h1>/);
  });

  it("offers the CV download and a jump to the contact band", async () => {
    const { html } = await homeHtml();

    expect(html).toMatch(/href="\/Marcus-Henaker-CV\.pdf"[^>]*>Download CV</);
    expect(html).toMatch(/href="#contact"[^>]*>Contact me</);
  });

  it("links to every Case study, in content order", async () => {
    const { html } = await homeHtml();

    const linked = [...html.matchAll(/href="\/work\/([a-z0-9-]+)"/g)].map((match) => match[1]);
    expect(linked).toEqual(caseStudies.map((study) => study.slug));
  });
});
