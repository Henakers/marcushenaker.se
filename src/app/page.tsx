import { getContent } from "@/content";
import { toNextMetadata } from "./metadata";

export const metadata = toNextMetadata(getContent().homeMetadata());

export default function HomePage() {
  const content = getContent();
  const { headline } = content.home();
  // `<` is escaped so content can never close the script tag early.
  const personJsonLd = JSON.stringify(content.personJsonLd()).replace(/</g, "\\u003c");

  return (
    <main className="mx-auto max-w-6xl px-6 pt-12 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd }} />
      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">{headline.title}</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{headline.pitch}</p>
    </main>
  );
}
