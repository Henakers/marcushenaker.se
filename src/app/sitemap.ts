import type { MetadataRoute } from "next";
import { getContent } from "@/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return getContent()
    .sitemapEntries()
    .map((url) => ({ url }));
}
