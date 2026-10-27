import { About } from "@/components/home/About";
import { ContactBand } from "@/components/home/ContactBand";
import { OtherWork } from "@/components/home/OtherWork";
import { getContent } from "@/content";
import { FeaturedProjects } from "@/components/featured-projects";
import { Hero } from "@/components/hero";

export default function HomePage() {
  const content = getContent();
  const home = content.home();
  const caseStudies = content.caseStudies();

  return (
    <main>
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
