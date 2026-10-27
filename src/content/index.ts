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
  /** The hero's status line and its two button labels. */
  hero: z.object({
    status: text,
    cvLabel: text,
    contactLabel: text,
  }),
  /** The top bar's section links; the name beside them is `person.name`. */
  topBar: z.object({
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
    /** The label of the contact band's CV button. */
    cvLabel: text,
  }),
  footer: z.object({
    hostingNote: text,
    repoUrl: externalUrl,
    copyright: text,
  }),
  site: z.object({
    /** The apex origin every canonical URL, sitemap entry and JSON-LD url is built on. No trailing slash. */
    url: z.url().regex(/[^/]$/, "must not end with a slash"),
    /** The home page's hand-written meta description. */
    description: z.string().min(1),
  }),
  /**
   * Who the site is about: the one name shown in the top bar, titles, preview images and the
   * Person JSON-LD (whose sameAs links come from `contact`).
   */
  person: z.object({
    name: text,
    locality: text,
  }),
});

export type HomeContent = z.infer<typeof homeSchema>;
export type Headline = HomeContent["headline"];
export type Hero = HomeContent["hero"];
export type TopBar = HomeContent["topBar"];
export type OtherWorkEntry = HomeContent["otherWork"][number];
export type About = HomeContent["about"];
export type Contact = HomeContent["contact"];
export type Footer = HomeContent["footer"];

const caseStudySchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lower-case words joined by hyphens"),
  title: z.string().min(1),
  order: z.number().int(),
  /** One sentence on the problem, shown on the Featured project card. */
  problem: z.string().min(1),
  /** The headline result, shown in green on the card. */
  result: z.string().min(1),
  /** The page's meta description. */
  description: z.string().min(1),
  role: z.string().min(1),
  period: z.string().min(1),
  /** The stack tags on the card and the page: three or four. */
  stack: z.array(z.string().min(1)).min(3).max(4),
  outcome: z.string().min(1),
  /** The Case study's row in the hero terminal panel: its SQL query and the output it shows. */
  terminal: z.object({
    query: z.string().min(1),
    value: z.string().min(1),
    label: z.string().min(1),
  }),
});

/** A Case study: its validated frontmatter plus the MDX body, rendered by the page. */
export type CaseStudy = z.infer<typeof caseStudySchema> & { body: string };

export interface Content {
  home(): HomeContent;
  /** Every Case study, in frontmatter `order`. */
  caseStudies(): CaseStudy[];
  /**
   * One Case study by slug, or undefined if there is none. `next` is the following Case study in
   * order and wraps from the last to the first, so every page links onwards.
   */
  caseStudy(slug: string): (CaseStudy & { next: CaseStudy }) | undefined;
  /** The home page's title, meta description and canonical URL. */
  homeMetadata(): PageMetadata;
  /** One Case study page's title, meta description and canonical URL, or undefined for an unknown slug. */
  caseStudyMetadata(slug: string): PageMetadata | undefined;
  /** The 404 page's title. It has no description or canonical URL: it is never indexed. */
  notFoundMetadata(): Pick<PageMetadata, "title">;
  /** schema.org `Person` structured data for the home page. Deliberately has no `worksFor`. */
  personJsonLd(): PersonJsonLd;
  /** The absolute URLs the sitemap lists: home, then every Case study in order. The CV and 404 are left out. */
  sitemapEntries(): string[];
  /** The site's apex origin, without a trailing slash. */
  siteUrl(): string;
}

export interface PersonJsonLd {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  jobTitle: string;
  url: string;
  sameAs: string[];
  address: { "@type": "PostalAddress"; addressLocality: string };
}

/** What a page tells search engines and link previews: its title, meta description and canonical URL. */
export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
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
  return readMdx(file, schema).data;
}

function readMdx<T>(file: string, schema: z.ZodType<T>): { data: T; body: string } {
  const shown = path.relative(process.cwd(), file);
  let source: string;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch {
    throw new ContentError(shown, undefined, "file is missing");
  }

  const { data, content } = matter(source);
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    throw new ContentError(shown, issue.path.join("."), issue.message);
  }
  return { data: result.data, body: content };
}

/** The `##` sections every Case study body has, in this order; the page template relies on them. */
const CASE_STUDY_SECTIONS = [
  "Problem",
  "My role",
  "Approach and decisions",
  "Constraints and what I rejected",
  "Outcome (measured)",
  "What I learned",
] as const;

function sectionHeadings(body: string): string[] {
  return [...body.matchAll(/^## +(.+?)\s*$/gm)].map((match) => match[1]!);
}

/** Loads `<slug>.mdx` files from `dir`. A missing directory means no Case studies. */
function loadCaseStudies(dir: string): CaseStudy[] {
  if (!fs.existsSync(dir)) return [];

  const studies: CaseStudy[] = [];
  const fileByOrder = new Map<number, string>();
  const names = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".mdx"))
    .sort();
  for (const name of names) {
    const file = path.join(dir, name);
    const shown = path.relative(process.cwd(), file);
    const { data, body } = readMdx(file, caseStudySchema);

    if (data.slug !== path.basename(name, ".mdx")) {
      throw new ContentError(shown, "slug", `must match the file name ("${name}")`);
    }
    const clash = fileByOrder.get(data.order);
    if (clash) {
      throw new ContentError(shown, "order", `${data.order} is already used by ${clash}`);
    }
    fileByOrder.set(data.order, name);
    if (sectionHeadings(body).join("\n") !== CASE_STUDY_SECTIONS.join("\n")) {
      const expected = CASE_STUDY_SECTIONS.map((s) => `"## ${s}"`).join(", ");
      throw new ContentError(shown, "body", `must have exactly the sections ${expected}, in order`);
    }

    studies.push({ ...data, body });
  }
  return studies.sort((a, b) => a.order - b.order);
}

/** Loads and validates every content file under `contentDir`. Throws a ContentError on the first problem. */
export function loadContent(contentDir: string): Content {
  const home = readFrontmatter(path.join(contentDir, "home.mdx"), homeSchema);
  const caseStudies = loadCaseStudies(path.join(contentDir, "case-studies"));
  const caseStudyUrl = (slug: string) => `${home.site.url}/work/${slug}`;
  /** The Case study with this slug and the one after it in order (wrapping), or undefined. */
  const findCaseStudy = (slug: string) => {
    const index = caseStudies.findIndex((study) => study.slug === slug);
    if (index === -1) return undefined;
    return { study: caseStudies[index]!, next: caseStudies[(index + 1) % caseStudies.length]! };
  };
  return {
    home: () => home,
    caseStudies: () => caseStudies,
    caseStudy: (slug) => {
      const found = findCaseStudy(slug);
      return found && { ...found.study, next: found.next };
    },
    homeMetadata: () => ({
      title: `${home.person.name} – ${home.headline.title}`,
      description: home.site.description,
      canonical: home.site.url,
    }),
    caseStudyMetadata: (slug) => {
      const study = findCaseStudy(slug)?.study;
      if (!study) return undefined;
      return {
        title: `${study.title} – ${home.person.name}`,
        description: study.description,
        canonical: caseStudyUrl(study.slug),
      };
    },
    notFoundMetadata: () => ({ title: `Page not found – ${home.person.name}` }),
    personJsonLd: () => ({
      "@context": "https://schema.org",
      "@type": "Person",
      name: home.person.name,
      jobTitle: home.headline.title,
      url: home.site.url,
      sameAs: [home.contact.linkedin, home.contact.github],
      address: { "@type": "PostalAddress", addressLocality: home.person.locality },
    }),
    sitemapEntries: () => [home.site.url, ...caseStudies.map((study) => caseStudyUrl(study.slug))],
    siteUrl: () => home.site.url,
  };
}

/** The directory holding the site's own content, relative to where `next build` runs. */
export const SITE_CONTENT_DIR = path.join(process.cwd(), "content");

let siteContent: Content | undefined;

/** The site's content, loaded and validated once. Pages, metadata and the sitemap read from here. */
export function getContent(): Content {
  siteContent ??= loadContent(SITE_CONTENT_DIR);
  return siteContent;
}
