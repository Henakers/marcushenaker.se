import Link from "next/link";
import type { CaseStudy } from "@/content";

/** One card per Case study, in content order; the whole card links to the case study. */
export function FeaturedProjects({ caseStudies }: { caseStudies: CaseStudy[] }) {
  return (
    <section id="work" className="border-t border-rule py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold">Featured projects</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {caseStudies.map((study) => (
            <Link
              key={study.slug}
              href={`/work/${study.slug}`}
              className="group flex flex-col rounded-xl border border-rule bg-white p-6 transition hover:border-accent hover:shadow-lg"
            >
              <p className="font-mono text-xs text-stone-400">/work/{study.slug}</p>
              <h3 className="mt-3 text-xl font-bold">{study.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{study.problem}</p>
              <p className="mt-5 font-semibold text-accent">{study.result}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {study.stack.slice(0, 4).map((tag) => (
                  <li key={tag} className="rounded bg-stone-100 px-2 py-1 font-mono text-xs">
                    {tag}
                  </li>
                ))}
              </ul>
              <span className="mt-6 text-sm font-semibold group-hover:text-accent">
                Read the case study →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
