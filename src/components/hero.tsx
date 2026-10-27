import { CV_PATH, type CaseStudy, type HomeContent } from "@/content";
import { TerminalPanel } from "@/components/terminal-panel";

/** The Pitch's first sentence is its lead, set larger; the rest follows as body text. */
function splitPitch(pitch: string): [lead: string, rest: string] {
  const end = pitch.indexOf(". ");
  if (end === -1) return [pitch, ""];
  return [pitch.slice(0, end + 1), pitch.slice(end + 2)];
}

export function Hero({
  home: { headline, hero },
  caseStudies,
}: {
  home: HomeContent;
  caseStudies: CaseStudy[];
}) {
  const [lead, rest] = splitPitch(headline.pitch);

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-12 pb-20 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="font-mono text-sm text-accent">
          <span aria-hidden="true">● </span>
          {hero.status}
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-7xl">{headline.title}</h1>
        <p className="mt-6 text-2xl font-semibold">{lead}</p>
        {rest && <p className="mt-2 max-w-xl text-lg leading-relaxed text-muted">{rest}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={CV_PATH}
            className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-accent"
          >
            {hero.cvLabel}
          </a>
          <a
            href="#contact"
            className="rounded-lg border border-stone-300 px-5 py-3 font-semibold hover:border-accent"
          >
            {hero.contactLabel}
          </a>
        </div>
      </div>
      <TerminalPanel caseStudies={caseStudies} />
    </section>
  );
}
