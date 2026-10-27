import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const text = z.string().min(1);
/** A site path ("/...", optionally "/#anchor") or an absolute https URL. */
const link = z.string().regex(/^(\/|https:\/\/)/, "must be a site path or an https URL");
const externalUrl = z.url({ protocol: /^https$/ });
/** An image under `public/`, referenced by its site path. */
const image = z.object({
  src: z.string().regex(/^\/[^/]/, "must be a path under public/, starting with /"),
  alt: text,
});

const homeSchema = z.object({
  headline: z.object({
    title: text,
    pitch: text,
  }),
  topBar: z.object({
    name: text,
    links: z.array(z.object({ label: text, href: link })).min(1),
  }),
  otherWork: z
    .array(
      z.object({
        name: text,
        line: text,
        tags: z.array(text).min(2).max(3),
        github: externalUrl,
        live: externalUrl.optional(),
        image: image.optional(),
      }),
    )
    .min(1),
  about: z.object({
    photo: image,
    paragraphs: z.array(text).min(1),
    location: text,
    skills: z.object({
      languages: z.array(text).min(1),
      data: z.array(text).min(1),
      infrastructure: z.array(text).min(1),
    }),
    currentlyLearning: text,
  }),
  contact: z.object({
    heading: text,
    availability: text,
    email: z.email(),
    linkedin: externalUrl,
    github: externalUrl,
  }),
  footer: z.object({
    hostingNote: text,
    repoUrl: externalUrl,
    copyright: text,
  }),
});

export type HomeContent = z.infer<typeof homeSchema>;
export type Headline = HomeContent["headline"];
export type TopBar = HomeContent["topBar"];
export type OtherWorkEntry = HomeContent["otherWork"][number];
export type About = HomeContent["about"];
export type Contact = HomeContent["contact"];
export type Footer = HomeContent["footer"];

export interface Content {
  home(): HomeContent;
}

/** Content that is missing or fails its schema. The message names the file and the field. */
export class ContentError extends Error {
  constructor(
    readonly file: string,
    readonly field: string | undefined,
    reason: string,
  ) {
    super(field ? `${file}: field "${field}" ${reason}` : `${file}: ${reason}`);
    this.name = "ContentError";
  }
}

function readFrontmatter<T>(file: string, schema: z.ZodType<T>): T {
  const shown = path.relative(process.cwd(), file);
  let source: string;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch {
    throw new ContentError(shown, undefined, "file is missing");
  }

  const result = schema.safeParse(matter(source).data);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    throw new ContentError(shown, issue.path.join("."), issue.message);
  }
  return result.data;
}

/** Loads and validates every content file under `contentDir`. Throws a ContentError on the first problem. */
export function loadContent(contentDir: string): Content {
  const home = readFrontmatter(path.join(contentDir, "home.mdx"), homeSchema);
  return { home: () => home };
}

/** The directory holding the site's own content, relative to where `next build` runs. */
export const SITE_CONTENT_DIR = path.join(process.cwd(), "content");

let siteContent: Content | undefined;

/** The site's content, loaded and validated once. Pages, metadata and the sitemap read from here. */
export function getContent(): Content {
  siteContent ??= loadContent(SITE_CONTENT_DIR);
  return siteContent;
}
