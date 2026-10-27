import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContentError, loadContent } from "@/content";

const fixture = (name: string) => path.join(import.meta.dirname, "__fixtures__", name);

describe("content module: home", () => {
  it("returns the Headline from valid home content", () => {
    const content = loadContent(fixture("valid"));

    expect(content.home().headline).toEqual({
      title: "Fixture Engineer",
      pitch: "Fixture pitch for the content module tests.",
    });
  });

  it("throws an error naming the file and field when a field is missing", () => {
    expect(() => loadContent(fixture("missing-pitch"))).toThrow(
      /missing-pitch[\\/]home\.mdx.*headline\.pitch/,
    );
  });

  it("throws an error naming the file when the home content is missing", () => {
    expect(() => loadContent(fixture("no-home"))).toThrow(/no-home[\\/]home\.mdx.*missing/);
  });
});

describe("content module: case studies", () => {
  it("lists the Case studies in frontmatter order, not file order", () => {
    const content = loadContent(fixture("valid"));

    expect(content.caseStudies().map((study) => study.slug)).toEqual(["gamma", "alpha", "beta"]);
  });

  it("gets one Case study by slug, with the next one in order as its neighbour", () => {
    const study = loadContent(fixture("valid")).caseStudy("gamma");

    expect(study?.title).toBe("Gamma study");
    expect(study?.next.slug).toBe("alpha");
  });

  it("wraps the next neighbour from the last Case study to the first", () => {
    const study = loadContent(fixture("valid")).caseStudy("beta");

    expect(study?.next.slug).toBe("gamma");
  });

  it("returns undefined for an unknown slug", () => {
    expect(loadContent(fixture("valid")).caseStudy("no-such-study")).toBeUndefined();
  });

  it.each([
    ["case-study-missing-description", "one.mdx", "description"],
    ["case-study-empty-stack", "one.mdx", "stack"],
    ["case-study-missing-terminal-value", "one.mdx", "terminal.value"],
    ["case-study-slug-mismatch", "one.mdx", "slug"],
    ["case-study-duplicate-order", "two.mdx", "order"],
    ["case-study-missing-section", "one.mdx", "body"],
    ["case-study-sections-out-of-order", "one.mdx", "body"],
  ])("fails on %s with an error naming the file and field", (dir, file, field) => {
    const error = captureError(() => loadContent(fixture(dir)));

    expect(error).toBeInstanceOf(ContentError);
    expect(error.message).toContain(path.join(dir, "case-studies", file));
    expect(error.message).toContain(`field "${field}"`);
  });
});

describe("content module: page metadata", () => {
  it("gives home its title, hand-written description and the apex canonical URL", () => {
    const content = loadContent(fixture("valid"));

    expect(content.homeMetadata()).toEqual({
      title: "Fixture Person – Fixture Engineer",
      description: "Fixture home description for search results.",
      canonical: "https://fixture.example",
    });
  });

  it("gives a Case study its title template, its own description and a canonical URL under /work", () => {
    const content = loadContent(fixture("valid"));

    expect(content.caseStudyMetadata("gamma")).toEqual({
      title: "Gamma study – Fixture Person",
      description: "Fixture description for gamma.",
      canonical: "https://fixture.example/work/gamma",
    });
  });

  it("has no Case study metadata for an unknown slug", () => {
    expect(loadContent(fixture("valid")).caseStudyMetadata("no-such-study")).toBeUndefined();
  });

  it("titles the 404 page and gives it no canonical URL", () => {
    expect(loadContent(fixture("valid")).notFoundMetadata()).toEqual({
      title: "Page not found – Fixture Person",
    });
  });
});

describe("content module: structured data and sitemap", () => {
  it("describes Marcus as a schema.org Person with the agreed fields and no employer", () => {
    const jsonLd = loadContent(fixture("valid")).personJsonLd();

    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Fixture Person",
      jobTitle: "Fixture Engineer",
      url: "https://fixture.example",
      sameAs: ["https://linkedin.example/fixture", "https://github.example/fixture"],
      address: { "@type": "PostalAddress", addressLocality: "Fixture Town" },
    });
    expect(jsonLd).not.toHaveProperty("worksFor");
  });

  it("lists home plus every Case study in the sitemap, and nothing else", () => {
    expect(loadContent(fixture("valid")).sitemapEntries()).toEqual([
      "https://fixture.example",
      "https://fixture.example/work/gamma",
      "https://fixture.example/work/alpha",
      "https://fixture.example/work/beta",
    ]);
  });

  it("gives the site origin for resolving URLs and pointing robots.txt at the sitemap", () => {
    expect(loadContent(fixture("valid")).siteUrl()).toBe("https://fixture.example");
  });

  it("rejects a site URL with a trailing slash, naming the field", () => {
    expect(() => loadContent(fixture("site-url-trailing-slash"))).toThrow(
      /site-url-trailing-slash[\\/]home\.mdx.*site\.url/,
    );
  });
});

function captureError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected an error, but none was thrown");
}
