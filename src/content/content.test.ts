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

function captureError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected an error, but none was thrown");
}
