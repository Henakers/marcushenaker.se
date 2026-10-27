import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

describe("home page", () => {
  it("returns 200 with the Title in an en-GB document", async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<html lang="en-GB"');
    expect(html).toMatch(/<h1[^>]*>Software Engineer<\/h1>/);
  });
});
