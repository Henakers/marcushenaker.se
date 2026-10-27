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

/** An MDX file's frontmatter and body, as a patch sees them. */
interface MdxFile {
  data: Frontmatter;
  body: string;
}

function readFixtureMdx(file: string): MdxFile {
  const parsed = matter(fs.readFileSync(file, "utf8"));
  // gray-matter caches parse results, so change a copy rather than the cached object.
  return { data: structuredClone(parsed.data), body: parsed.content };
}

function writeMdx(file: string, { data, body }: MdxFile) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, matter.stringify(body, data));
}

interface Patch {
  /** A change to the valid home frontmatter. */
  home?: (data: Frontmatter) => void;
  /**
   * Replaces the valid Case studies with these files, keyed by file name. Each starts as a copy
   * of the valid `gamma.mdx` with its slug set to the file name and a unique order, then the
   * change is applied.
   */
  caseStudies?: Record<string, (study: MdxFile) => void>;
  /** A change to the valid CV frontmatter. */
  cv?: (data: Frontmatter) => void;
}

/** A temporary copy of the `valid` fixture with a patch applied, so every variant shares one source. */
function validContentWith({ home, caseStudies, cv }: Patch): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-fixture-"));
  tempDirs.push(dir);
  fs.cpSync(fixture("valid"), dir, { recursive: true });

  const patchFrontmatter = (file: string, change: (data: Frontmatter) => void) => {
    const mdx = readFixtureMdx(path.join(dir, file));
    change(mdx.data);
    writeMdx(path.join(dir, file), mdx);
  };

  if (home) patchFrontmatter("home.mdx", home);
  if (caseStudies) {
    const studiesDir = path.join(dir, "case-studies");
    fs.rmSync(studiesDir, { recursive: true });
    Object.entries(caseStudies).forEach(([name, change], index) => {
      const study = readFixtureMdx(path.join(fixture("valid"), "case-studies", "gamma.mdx"));
      study.data.slug = path.basename(name, ".mdx");
      study.data.order = index + 1;
      change(study);
      writeMdx(path.join(studiesDir, name), study);
    });
    // The valid CV's code links name the valid Case studies, which are gone now.
    patchFrontmatter(path.join("cv", "cv.md"), (data) => delete data.caseStudyRepos);
  }
  if (cv) patchFrontmatter(path.join("cv", "cv.md"), cv);
  return dir;
}

/** A copy of the `valid` fixture with one change applied to the home frontmatter. */
const validHomeWith = (change: (data: Frontmatter) => void) => validContentWith({ home: change });

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
      links: [
        { label: "Work", href: "/#work" },
        { label: "CV", href: "/Marcus-Henaker-CV.pdf" },
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
      cvLabel: "Fixture CV",
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
    ["contact.cvLabel", (data: Frontmatter) => delete data.contact.cvLabel],
    ["footer.repoUrl", (data: Frontmatter) => delete data.footer.repoUrl],
    ["hero.contactLabel", (data: Frontmatter) => delete data.hero.contactLabel],
    ["topBar.links.0.href", (data: Frontmatter) => (data.topBar.links[0].href = "#work")],
  ])("throws an error naming home.mdx and %s when it is invalid", (field, change) => {
    const dir = validHomeWith(change);

    expect(() => loadContent(dir)).toThrow(`home.mdx: field "${field}"`);
  });

  it("throws an error naming the file and field when a field is missing", () => {
    const dir = validHomeWith((data) => delete data.headline.pitch);

    expect(() => loadContent(dir)).toThrow('home.mdx: field "headline.pitch"');
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

  it("gets one Case study by slug, with the next one in order as its neighbor", () => {
    const study = loadContent(fixture("valid")).caseStudy("gamma");

    expect(study?.title).toBe("Gamma study");
    expect(study?.next.slug).toBe("alpha");
  });

  it("wraps the next neighbor from the last Case study to the first", () => {
    const study = loadContent(fixture("valid")).caseStudy("beta");

    expect(study?.next.slug).toBe("gamma");
  });

  it("returns undefined for an unknown slug", () => {
    expect(loadContent(fixture("valid")).caseStudy("no-such-study")).toBeUndefined();
  });

  it.each([
    ["a missing description", "one.mdx", "description", { "one.mdx": dropField("description") }],
    ["an empty stack", "one.mdx", "stack", { "one.mdx": setField("stack", []) }],
    ["two stack tags", "one.mdx", "stack", { "one.mdx": setField("stack", ["Go", "SQL"]) }],
    [
      "five stack tags",
      "one.mdx",
      "stack",
      { "one.mdx": setField("stack", ["Go", "SQL", "Docker", "Linux", "Git"]) },
    ],
    [
      "a missing terminal value",
      "one.mdx",
      "terminal.value",
      { "one.mdx": ({ data }: MdxFile) => delete data.terminal.value },
    ],
    [
      "a slug that is not the file name",
      "one.mdx",
      "slug",
      { "one.mdx": setField("slug", "other") },
    ],
    [
      "a duplicate order",
      "two.mdx",
      "order",
      { "one.mdx": setField("order", 1), "two.mdx": setField("order", 1) },
    ],
    [
      "a missing section",
      "one.mdx",
      "body",
      {
        "one.mdx": (study: MdxFile) => {
          study.body = study.body.replace(/^## Constraints and what I rejected$/m, "");
        },
      },
    ],
    [
      "sections out of order",
      "one.mdx",
      "body",
      {
        "one.mdx": (study: MdxFile) => {
          study.body = study.body
            .replace("## Problem", "## PLACEHOLDER")
            .replace("## My role", "## Problem")
            .replace("## PLACEHOLDER", "## My role");
        },
      },
    ],
  ])(
    "fails on a Case study with %s, with an error naming the file and field",
    (_, file, field, caseStudies) => {
      const error = captureError(() => loadContent(validContentWith({ caseStudies })));

      expect(error).toBeInstanceOf(ContentError);
      expect(error.message).toContain(`${path.join("case-studies", file)}: field "${field}"`);
    },
  );
});

describe("content module: CV", () => {
  it("takes the name, Title and contact details from the home content", () => {
    const cv = loadContent(fixture("valid")).cv();

    expect(cv.name).toBe("Fixture Person");
    expect(cv.title).toBe("Fixture Engineer");
    expect(cv.contact).toEqual({
      email: "fixture@example.com",
      website: "https://fixture.example",
      linkedin: "https://www.linkedin.com/in/fixture",
      github: "https://github.com/fixture",
      location: "Fixture Town, Sweden",
    });
  });

  it("takes the skills and what Marcus is learning from the About section", () => {
    const cv = loadContent(fixture("valid")).cv();

    expect(cv.skills).toEqual({
      languages: ["Python", "SQL"],
      data: ["PostgreSQL"],
      infrastructure: ["Docker"],
    });
    expect(cv.currentlyLearning).toBe("Go");
  });

  it("lists every Case study in order, with its result, site URL and any code link", () => {
    const cv = loadContent(fixture("valid")).cv();

    expect(cv.projects).toEqual([
      {
        title: "Gamma study",
        result: "Fixture result for gamma.",
        url: "https://fixture.example/work/gamma",
      },
      {
        title: "Alpha study",
        result: "Fixture result for alpha.",
        url: "https://fixture.example/work/alpha",
        repo: "https://github.com/example/alpha",
      },
      {
        title: "Beta study",
        result: "Fixture result for beta.",
        url: "https://fixture.example/work/beta",
      },
    ]);
  });

  it("takes the summary, experience and education from the CV source", () => {
    const cv = loadContent(fixture("valid")).cv();

    expect(cv.summary).toBe("Fixture summary for the CV.");
    expect(cv.experience).toEqual([
      {
        role: "Fixture Role",
        organization: "Fixture Employer",
        period: "2024–present",
        bullets: ["Fixture bullet one.", "Fixture bullet two."],
      },
    ]);
    expect(cv.education).toEqual([
      {
        degree: "BSc Fixture Studies",
        school: "Fixture University",
        period: "2021–2024",
        note: "Fixture note.",
      },
    ]);
  });

  it.each([
    ["summary", (data: Frontmatter) => delete data.summary],
    ["experience.0.organization", (data: Frontmatter) => delete data.experience[0].organization],
    ["education", (data: Frontmatter) => (data.education = [])],
    [
      "caseStudyRepos.alpha",
      (data: Frontmatter) => (data.caseStudyRepos.alpha = "http://github.com/example"),
    ],
    [
      "caseStudyRepos.no-such-study",
      (data: Frontmatter) => (data.caseStudyRepos["no-such-study"] = "https://github.com/x"),
    ],
  ])("throws an error naming cv.md and %s when it is invalid", (field, change) => {
    const dir = validContentWith({ cv: change });

    expect(() => loadContent(dir)).toThrow(`${path.join("cv", "cv.md")}: field "${field}"`);
  });

  it("throws an error naming the CV source when it is missing", () => {
    const dir = validContentWith({});
    fs.rmSync(path.join(dir, "cv"), { recursive: true });

    expect(() => loadContent(dir)).toThrow(`${path.join("cv", "cv.md")}: file is missing`);
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
    const dir = validHomeWith((data) => (data.site.url = "https://fixture.example/"));

    expect(() => loadContent(dir)).toThrow('home.mdx: field "site.url"');
  });
});

function dropField(field: string) {
  return ({ data }: MdxFile) => delete data[field];
}

function setField(field: string, value: unknown) {
  return ({ data }: MdxFile) => (data[field] = value);
}

function captureError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected an error, but none was thrown");
}
