import { About } from "@/components/home/about";
import { ContactBand } from "@/components/home/contact-band";
import { OtherWork } from "@/components/home/other-work";
import { getContent } from "@/content";
import { FeaturedProjects } from "@/components/featured-projects";
import { Hero } from "@/components/hero";
import { toNextMetadata } from "./metadata";

export const metadata = toNextMetadata(getContent().homeMetadata());

export default function HomePage() {
  const content = getContent();
  const home = content.home();
  const caseStudies = content.caseStudies();
  // `<` is escaped so content can never close the script tag early.
  const personJsonLd = JSON.stringify(content.personJsonLd()).replace(/</g, "\\u003c");

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd }} />
      <Hero home={home} caseStudies={caseStudies} />

      <section id="work" className="border-t border-rule py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FeaturedProjects caseStudies={caseStudies} />
          <OtherWork entries={home.otherWork} />
        </div>
      </section>

      <About {...home.about} />
      <ContactBand {...home.contact} />
    </main>
  );
}
