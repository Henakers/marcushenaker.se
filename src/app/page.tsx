import { getContent } from "@/content";
import { FeaturedProjects } from "@/components/featured-projects";
import { Hero } from "@/components/hero";

export default function HomePage() {
  const content = getContent();
  const caseStudies = content.caseStudies();

  return (
    <main>
      <Hero home={content.home()} caseStudies={caseStudies} />
      <FeaturedProjects caseStudies={caseStudies} />
    </main>
  );
}
