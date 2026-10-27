import { beforeAll, describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

/** The page's HTML with React's text markers removed and the entities it escapes turned back into characters. */
async function page(path: string): Promise<{ status: number; html: string }> {
  const response = await fetch(`${baseUrl}${path}`);
  const html = (await response.text())
    .replaceAll("<!-- -->", "")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
  return { status: response.status, html };
}

describe("home page sections", () => {
  let html: string;
  beforeAll(async () => {
    ({ html } = await page("/"));
  });

  it("has a top bar linking home and to Work, About, CV and Contact from any page", () => {
    expect(html).toMatch(/<header[\s\S]*<a[^>]*href="\/"[^>]*>Marcus Henåker<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/#work"[^>]*>Work<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/#about"[^>]*>About<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/Marcus-Henaker-CV.pdf"[^>]*>CV<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/#contact"[^>]*>Contact<\/a>/);
  });

  it("has the sections the top bar links to, in order", () => {
    const work = html.indexOf('id="work"');
    const about = html.indexOf('id="about"');
    const contact = html.indexOf('id="contact"');

    expect(work).toBeGreaterThan(-1);
    expect(about).toBeGreaterThan(work);
    expect(contact).toBeGreaterThan(about);
  });

  it("lists Other work with GitHub links", () => {
    expect(html).toContain("Other work");
    expect(html).toMatch(/<a[^>]*href="https:\/\/github\.com\/[^"]+"[^>]*>GitHub<\/a>/);
  });

  it("shows About with the lead sentence, location, skill groups and Currently learning", () => {
    expect(html).toContain(
      "I like the unglamorous part: cleaning, validating and standardising data until people can trust it.",
    );
    expect(html).toContain("Gothenburg area, Sweden");
    for (const group of ["languages", "data", "infrastructure"]) {
      expect(html).toMatch(new RegExp(`>${group}</`));
    }
    expect(html).toContain("Currently learning: Go.");
  });

  it("serves the About photo through next/image", async () => {
    const src = html.match(
      /<img[^>]*alt="[^"]*Photo of Marcus[^"]*"[^>]*src="(\/_next\/image\?[^"]+)"/,
    )?.[1];
    expect(src).toBeDefined();

    const response = await fetch(`${baseUrl}${src}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^image\//);
  });

  it("shows the contact band with a copyable email, a mailto link and the availability line", () => {
    expect(html).toContain("Let's talk.");
    expect(html).toMatch(/href="mailto:marcushenaker@gmail\.com"/);
    expect(html).toMatch(/<span[^>]*>marcushenaker@gmail\.com<\/span>/);
    expect(html).toContain(
      "Open to backend and data engineering roles: on-site or hybrid around Gothenburg, or remote. I'm not afraid to relocate and try something new.",
    );
    expect(html).toMatch(/<a[^>]*href="https:\/\/www\.linkedin\.com\/[^"]+"[^>]*>LinkedIn<\/a>/);
  });

  it("ends with the footer linking the public code repo, without repeating contact links", () => {
    const footer = html.slice(html.lastIndexOf("<footer"), html.lastIndexOf("</footer>"));

    expect(footer).toMatch(
      /<a[^>]*href="https:\/\/github\.com\/Henakers\/marcushenaker\.se"[^>]*>Self-hosted on my home server with Docker and Cloudflare Tunnel/,
    );
    expect(footer).toContain("© 2026 Marcus Henåker");
    expect(footer).not.toContain("mailto:");
    expect(footer).not.toContain("linkedin.com");
  });
});

describe("shared layout", () => {
  it("gives other pages the same top bar and footer", async () => {
    const { html } = await page("/no-such-page");

    expect(html).toMatch(/<a[^>]*href="\/#work"[^>]*>Work<\/a>/);
    expect(html).toContain("Self-hosted on my home server with Docker and Cloudflare Tunnel");
  });
});
