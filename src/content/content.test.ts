import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { afterAll, describe, expect, it } from "vitest";
import { ContentError, loadContent } from "@/content";

const fixture = (name: string) => path.join(import.meta.dirname, "__fixtures__", name);

// Untyped on purpose: the tests break the frontmatter in ways the HomeContent type forbids.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Frontmatter = Record<string, any>;

const tempDirs: string[] = [];
afterAll(() => tempDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

/** A fixture directory holding the valid home content with one change applied to its frontmatter. */
function validHomeWith(change: (data: Frontmatter) => void): string {
  const parsed = matter(fs.readFileSync(path.join(fixture("valid"), "home.mdx"), "utf8"));
  // gray-matter caches parse results, so change a copy rather than the cached object.
  const data = structuredClone(parsed.data);
  change(data);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "home-fixture-"));
  tempDirs.push(dir);
  fs.writeFileSync(path.join(dir, "home.mdx"), matter.stringify(parsed.content, data));
  return dir;
}

describe("content module: home", () => {
  it("returns the Headline from valid home content", () => {
    const content = loadContent(fixture("valid"));

    expect(content.home().headline).toEqual({
      title: "Fixture Engineer",
      pitch: "Fixture pitch for the content module tests.",
    });
  });

  it("returns the hero's status line and button labels", () => {
    const content = loadContent(fixture("valid"));

    expect(content.home().hero).toEqual({
      status: "fixture status",
      cvLabel: "Fixture CV",
      contactLabel: "Fixture contact",
    });
  });

  it("returns the top bar, Other work, About, contact band and footer from valid home content", () => {
    const home = loadContent(fixture("valid")).home();

    expect(home.topBar).toEqual({
      name: "Fixture Name",
      links: [
        { label: "Work", href: "/#work" },
        { label: "CV", href: "/fixture-cv.pdf" },
      ],
    });
    expect(home.otherWork).toEqual([
      {
        name: "Fixture booking system",
        line: "Fixture line with an image.",
        tags: ["JavaScript", "Canvas"],
        github: "https://github.com/example/booking",
        image: { src: "/fixture-canvas.png", alt: "Fixture canvas" },
      },
      {
        name: "Fixture website",
        line: "Fixture line with a live link.",
        tags: ["HTML", "CSS", "JavaScript"],
        github: "https://github.com/example/website",
        live: "https://example.com",
      },
    ]);
    expect(home.about).toEqual({
      photo: { src: "/fixture-photo.png", alt: "Fixture photo" },
      paragraphs: ["Fixture lead sentence.", "Fixture second sentence."],
      location: "Fixture Town, Sweden",
      skills: { languages: ["Python", "SQL"], data: ["PostgreSQL"], infrastructure: ["Docker"] },
      currentlyLearning: "Go",
    });
    expect(home.contact).toEqual({
      heading: "Fixture talk.",
      availability: "Fixture availability line.",
      email: "fixture@example.com",
      linkedin: "https://www.linkedin.com/in/fixture",
      github: "https://github.com/fixture",
    });
    expect(home.footer).toEqual({
      hostingNote: "Fixture hosting note",
      repoUrl: "https://github.com/example/site",
      copyright: "© 2026 Fixture Name",
    });
  });

  it("accepts an Other work entry without a live link or an image", () => {
    const dir = validHomeWith((data) => {
      delete data.otherWork[0].image;
    });

    const entry = loadContent(dir).home().otherWork[0]!;
    expect(entry.image).toBeUndefined();
    expect(entry.live).toBeUndefined();
  });

  it.each([
    ["about.location", (data: Frontmatter) => delete data.about.location],
    ["about.skills.data", (data: Frontmatter) => delete data.about.skills.data],
    ["about.currentlyLearning", (data: Frontmatter) => delete data.about.currentlyLearning],
    ["about.photo.src", (data: Frontmatter) => (data.about.photo.src = "photo.png")],
    ["otherWork.0.tags", (data: Frontmatter) => (data.otherWork[0].tags = ["Only one"])],
    ["otherWork.1.tags", (data: Frontmatter) => data.otherWork[1].tags.push("A", "B")],
    ["otherWork.1.live", (data: Frontmatter) => (data.otherWork[1].live = "not a url")],
    ["contact.email", (data: Frontmatter) => (data.contact.email = "not-an-email")],
    ["contact.availability", (data: Frontmatter) => delete data.contact.availability],
    ["footer.repoUrl", (data: Frontmatter) => delete data.footer.repoUrl],
    ["hero.contactLabel", (data: Frontmatter) => delete data.hero.contactLabel],
    ["topBar.links.0.href", (data: Frontmatter) => (data.topBar.links[0].href = "#work")],
  ])("throws an error naming home.mdx and %s when it is invalid", (field, change) => {
    const dir = validHomeWith(change);

    expect(() => loadContent(dir)).toThrow(`home.mdx: field "${field}"`);
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
      sameAs: ["https://www.linkedin.com/in/fixture", "https://github.com/fixture"],
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
