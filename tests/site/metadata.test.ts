import { describe, expect, inject, it } from "vitest";
import { getContent } from "@/content";

const baseUrl = inject("baseUrl");
const origin = "https://marcushenaker.se";
const caseStudies = getContent().caseStudies();

async function page(pathname: string) {
  const response = await fetch(`${baseUrl}${pathname}`);
  return { status: response.status, html: await response.text() };
}

/** Decodes the few entities React escapes in attribute values and text. */
function decode(text: string): string {
  return text
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

/** Every tag of `tagName` in `html`, as a map of its attributes. */
function tags(html: string, tagName: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>`, "g"))].map((match) =>
    Object.fromEntries(
      [...match[1]!.matchAll(/([\w:-]+)="([^"]*)"/g)].map((attr) => [attr[1]!, decode(attr[2]!)]),
    ),
  );
}

function title(html: string) {
  return decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
}
const metaContent = (html: string, key: string) =>
  tags(html, "meta")
    .filter((tag) => tag.name === key || tag.property === key)
    .map((tag) => tag.content);
const canonical = (html: string) =>
  tags(html, "link")
    .filter((tag) => tag.rel === "canonical")
    .map((tag) => tag.href);

function jsonLd(html: string): unknown[] {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]!),
  );
}

describe("search metadata", () => {
  it("titles home, describes it, and canonicalises it to the apex origin", async () => {
    const { status, html } = await page("/");

    expect(status).toBe(200);
    expect(title(html)).toBe("Marcus Henåker – Software Engineer");
    expect(metaContent(html, "description")).toEqual([getContent().home().site.description]);
    expect(canonical(html)).toEqual([origin]);
    expect(metaContent(html, "og:locale")).toEqual(["en_GB"]);
  });

  it.each(caseStudies.map((study) => [study.slug, study]))(
    "titles /work/%s after its Case study, with its description and canonical URL",
    async (slug, study) => {
      const { status, html } = await page(`/work/${slug}`);

      expect(status).toBe(200);
      expect(title(html)).toBe(`${study.title} – Marcus Henåker`);
      expect(metaContent(html, "description")).toEqual([study.description]);
      expect(canonical(html)).toEqual([`${origin}/work/${slug}`]);
      expect(metaContent(html, "og:locale")).toEqual(["en_GB"]);
      expect(jsonLd(html)).toEqual([]);
    },
  );

  it("puts the Person JSON-LD on home, without an employer", async () => {
    const { html } = await page("/");

    expect(jsonLd(html)).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "Person",
        name: "Marcus Henåker",
        jobTitle: "Software Engineer",
        url: origin,
        sameAs: [getContent().home().person.linkedin, "https://github.com/Henakers"],
        address: { "@type": "PostalAddress", addressLocality: "Gothenburg" },
      },
    ]);
  });
});

describe("404 page", () => {
  it("returns 404, titled and marked noindex, with a link home", async () => {
    const { status, html } = await page("/no-such-page");

    expect(status).toBe(404);
    expect(title(html)).toBe("Page not found – Marcus Henåker");
    expect(metaContent(html, "robots")).toEqual(["noindex"]);
    expect(canonical(html)).toEqual([]);
    expect(html).toContain('href="/"');
  });
});

describe("sitemap and robots", () => {
  it("lists exactly home and every Case study in sitemap.xml", async () => {
    const response = await fetch(`${baseUrl}/sitemap.xml`);
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);

    expect(response.status).toBe(200);
    expect(urls).toEqual([origin, ...caseStudies.map((study) => `${origin}/work/${study.slug}`)]);
  });

  it("allows everything in robots.txt and points to the sitemap", async () => {
    const response = await fetch(`${baseUrl}/robots.txt`);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toMatch(/User-Agent: \*\r?\nAllow: \//i);
    expect(text).not.toMatch(/Disallow/i);
    expect(text).toContain(`Sitemap: ${origin}/sitemap.xml`);
  });
});

describe("icons", () => {
  it("links an SVG favicon and a PNG apple-icon that are served", async () => {
    const { html } = await page("/");
    const icon = tags(html, "link").find(
      (tag) => tag.rel === "icon" && tag.type === "image/svg+xml",
    );
    const appleIcon = tags(html, "link").find((tag) => tag.rel === "apple-touch-icon");

    expect(icon).toBeDefined();
    expect(appleIcon).toBeDefined();

    const iconResponse = await fetch(new URL(icon!.href!, baseUrl));
    expect(iconResponse.status).toBe(200);
    expect(iconResponse.headers.get("content-type")).toContain("image/svg+xml");

    const appleResponse = await fetch(new URL(appleIcon!.href!, baseUrl));
    expect(appleResponse.status).toBe(200);
    expect(appleResponse.headers.get("content-type")).toContain("image/png");
  });
});
