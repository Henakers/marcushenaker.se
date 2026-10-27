import { About } from "@/components/home/About";
import { ContactBand } from "@/components/home/ContactBand";
import { OtherWork } from "@/components/home/OtherWork";
import { getContent } from "@/content";
import { toNextMetadata } from "./metadata";

export const metadata = toNextMetadata(getContent().homeMetadata());

export default function HomePage() {
  const content = getContent();
  const { headline, otherWork, about, contact } = content.home();
  // `<` is escaped so content can never close the script tag early.
  const personJsonLd = JSON.stringify(content.personJsonLd()).replace(/</g, "\\u003c");

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd }} />
      {/* Headline: the hero (name, Title, Pitch, buttons, terminal panel) is built by #27. */}
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-20">
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">{headline.title}</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{headline.pitch}</p>
      </div>

      <section id="work" className="border-t border-rule py-20">
        <div className="mx-auto max-w-6xl px-6">
          {/* Featured projects: the heading and card grid from #27 go here, above Other work. */}
          <OtherWork entries={otherWork} />
        </div>
      </section>

      <About {...about} />
      <ContactBand {...contact} />
    </main>
  );
}
