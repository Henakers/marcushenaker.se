import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { afterAll, describe, expect, it } from "vitest";
import { loadContent } from "@/content";

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
