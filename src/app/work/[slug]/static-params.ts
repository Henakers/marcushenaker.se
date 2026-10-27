import { getContent } from "@/content";

/** One `/work/[slug]` route per Case study; shared by the page and its preview image. */
export function generateStaticParams() {
  return getContent()
    .caseStudies()
    .map(({ slug }) => ({ slug }));
}
