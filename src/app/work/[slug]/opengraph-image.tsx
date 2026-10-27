import { notFound } from "next/navigation";
import { getContent } from "@/content";
import {
  previewImage,
  previewImageContentType,
  previewImageSize,
} from "@/components/preview-image";

export const alt = `A case study by ${getContent().home().person.name}`;
export const size = previewImageSize;
export const contentType = previewImageContentType;

// Image routes do not inherit the page's params, so list the slugs here too: every image is
// rendered at build time, and an unknown slug is a 404 rather than a render on request.
export const dynamicParams = false;

export function generateStaticParams() {
  return getContent()
    .caseStudies()
    .map(({ slug }) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getContent().caseStudy(slug);
  if (!study) notFound();

  return previewImage({
    kicker: `/work/${study.slug}`,
    heading: study.title,
    detail: study.result,
    tone: "accent",
    footer: getContent().home().person.name,
  });
}
