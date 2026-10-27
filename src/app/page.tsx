import { About } from "@/components/home/About";
import { ContactBand } from "@/components/home/ContactBand";
import { OtherWork } from "@/components/home/OtherWork";
import { getContent } from "@/content";

export default function HomePage() {
  const { headline, otherWork, about, contact } = getContent().home();

  return (
    <main>
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
