// Renders the CV source (content/cv/cv.md) to public/Marcus-Henaker-CV.pdf.
//
// Run by hand with `pnpm cv` whenever a case-study number, role or skill changes,
// then commit the PDF. CI never builds the CV.
//
// The CV is an HTML page printed to A4 by headless Chromium (Playwright), so the
// text stays real, selectable text in IBM Plex Sans, and links stay clickable.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { chromium } from "playwright";
import { z } from "zod";
import { PLEX_SANS_DIR, PLEX_SANS_FILES } from "../src/fonts.ts";

const SOURCE = "content/cv/cv.md";
const OUTPUT = "public/Marcus-Henaker-CV.pdf";
const ACCENT = "#15803d";

const text = z.string().min(1);
const url = z.url({ protocol: /^https$/ });

const cvSchema = z.object({
  name: text,
  title: text,
  contact: z.object({
    email: z.email(),
    website: url,
    linkedin: url,
    github: url,
    location: text,
  }),
  summary: text,
  experience: z
    .array(
      z.object({
        role: text,
        organization: text,
        period: text,
        bullets: z.array(text).min(1),
      }),
    )
    .min(1),
  projects: z.array(z.object({ name: text, result: text, url, repo: url.optional() })).min(1),
  skills: z.record(text, z.array(text).min(1)),
  currentlyLearning: text,
  education: z
    .array(z.object({ degree: text, school: text, period: text, note: text.optional() }))
    .min(1),
});

type Cv = z.infer<typeof cvSchema>;

function loadCv(file: string): Cv {
  const result = cvSchema.safeParse(matter(fs.readFileSync(file, "utf8")).data);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    throw new Error(`${file}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  return result.data;
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** "https://marcushenaker.se/work/x" shown as "marcushenaker.se/work/x". */
function shortUrl(href: string): string {
  return href.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function link(href: string): string {
  return `<a href="${esc(href)}">${esc(shortUrl(href))}</a>`;
}

function fontFaces(): string {
  // The same IBM Plex Sans files the preview images use.
  return PLEX_SANS_FILES.map(({ weight, file: name }) => {
    const file = path.resolve(PLEX_SANS_DIR, name);
    return `@font-face { font-family: "IBM Plex Sans"; font-weight: ${weight}; src: url("${pathToFileURL(file).href}") format("woff"); }`;
  }).join("\n");
}

function renderHtml(cv: Cv, updated: string): string {
  const { contact } = cv;
  const contactLine = [
    `<a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>`,
    link(contact.website),
    link(contact.linkedin),
    link(contact.github),
    esc(contact.location),
  ]
    // Each item stays whole when the line wraps, so text extraction never splits one.
    .map((item) => `<span class="nowrap">${item}</span>`)
    .join(" · ");

  const experience = cv.experience
    .map(
      (job) => `
      <div class="entry">
        <div class="entry-head"><span><strong>${esc(job.role)}</strong>, ${esc(job.organization)}</span><span class="period">${esc(job.period)}</span></div>
        <ul>${job.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");

  const projects = cv.projects
    .map(
      (project) => `
      <li><strong>${esc(project.name)}</strong>: ${esc(project.result)}. ${link(project.url)}${
        project.repo ? ` · Code: ${link(project.repo)}` : ""
      }</li>`,
    )
    .join("");

  const skills = Object.entries(cv.skills)
    .map(([group, items]) => `<p><strong>${esc(group)}:</strong> ${items.map(esc).join(", ")}</p>`)
    .join("");

  const education = cv.education
    .map(
      (degree) => `
      <div class="entry">
        <div class="entry-head"><span><strong>${esc(degree.degree)}</strong>, ${esc(degree.school)}</span><span class="period">${esc(degree.period)}</span></div>
        ${degree.note ? `<p>${esc(degree.note)}</p>` : ""}
      </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>${esc(cv.name)} – CV</title>
<style>
${fontFaces()}
@page { size: A4; margin: 16mm 18mm 14mm; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: "IBM Plex Sans", sans-serif; font-size: 9.6pt; line-height: 1.42; color: #1c1917; }
a { color: inherit; text-decoration: none; white-space: nowrap; }
h1 { font-size: 22pt; font-weight: 700; margin: 0; line-height: 1.1; }
.title { font-size: 12pt; font-weight: 600; color: ${ACCENT}; margin: 2pt 0 4pt; }
.contact { color: #57534e; font-size: 9pt; }
h2 { font-size: 11pt; font-weight: 600; margin: 13pt 0 5pt; padding-bottom: 2pt; border-bottom: 0.75pt solid ${ACCENT}; }
p { margin: 0 0 3pt; }
ul { margin: 2pt 0 0; padding-left: 13pt; }
li { margin-bottom: 1.5pt; }
.entry { margin-bottom: 7pt; }
.entry-head { display: flex; justify-content: space-between; gap: 12pt; }
.period, .nowrap { white-space: nowrap; }
.period { color: #57534e; }
footer { margin-top: 14pt; color: #78716c; font-size: 8pt; }
</style>
</head>
<body>
<header>
  <h1>${esc(cv.name)}</h1>
  <p class="title">${esc(cv.title)}</p>
  <p class="contact">${contactLine}</p>
</header>
<h2>Summary</h2>
<p>${esc(cv.summary)}</p>
<h2>Experience</h2>
${experience}
<h2>Selected projects</h2>
<ul>${projects}</ul>
<h2>Skills</h2>
${skills}
<p>Currently learning: ${esc(cv.currentlyLearning)}.</p>
<h2>Education</h2>
${education}
<footer>Updated ${esc(updated)}</footer>
</body>
</html>`;
}

async function main() {
  const cv = loadCv(SOURCE);
  const updated = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const html = renderHtml(cv, updated);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Load from a file URL so the page may read the local font files.
    const tmp = path.resolve("node_modules/.cache/cv.html");
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, html);
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: OUTPUT,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    });
  } finally {
    await browser.close();
  }
  console.log(`Wrote ${OUTPUT} (Updated ${updated}).`);
}

await main();
