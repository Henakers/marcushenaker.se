import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

describe("the CV", () => {
  it("is served as a PDF at /Marcus-Henaker-CV.pdf", async () => {
    const response = await fetch(`${baseUrl}/Marcus-Henaker-CV.pdf`);
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("is linked from the hero, the top bar and the contact band", async () => {
    const html = await (await fetch(`${baseUrl}/`)).text();
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    const contact = html.slice(html.indexOf('id="contact"'));
    const main = html.slice(html.indexOf("</header>"), html.indexOf('id="contact"'));
    const cvLink = /<a[^>]*href="\/Marcus-Henaker-CV\.pdf"/;

    expect(header).toMatch(cvLink);
    expect(main).toMatch(cvLink);
    expect(contact).toMatch(cvLink);
  });
});
