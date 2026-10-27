import type { Metadata } from "next";
import { getContent, type PageMetadata } from "@/content";

/**
 * Open Graph fields every page shares. Next.js merges metadata shallowly, so a page that sets
 * `openGraph` must spread these in or it loses them.
 */
export function baseOpenGraph() {
  return {
    locale: "en_GB",
    type: "website",
    siteName: getContent().home().person.name,
  } as const;
}

/** Adapts the content module's page metadata to the Next.js Metadata API. */
export function toNextMetadata({ title, description, canonical }: PageMetadata): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { ...baseOpenGraph(), title, description, url: canonical },
  };
}
