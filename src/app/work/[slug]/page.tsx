import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/content";
import { CaseStudyBody } from "@/components/case-study-body";
import { toNextMetadata } from "../../metadata";

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const metadata = getContent().caseStudyMetadata(slug);
  return metadata ? toNextMetadata(metadata) : {};
}

export { generateStaticParams } from "./static-params";

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const study = getContent().caseStudy(slug);
  if (!study) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 pt-12 pb-20">
      <p className="font-mono text-xs text-stone-400">/work/{study.slug}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{study.title}</h1>

      <dl className="mt-8 grid gap-4 rounded-xl border border-rule bg-white p-6 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-xs text-stone-400">role</dt>
          <dd className="mt-1">{study.role}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-stone-400">period</dt>
          <dd className="mt-1">{study.period}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-stone-400">stack</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {study.stack.map((tag) => (
              <span key={tag} className="rounded bg-stone-100 px-2 py-1 font-mono text-xs">
                {tag}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-stone-400">outcome</dt>
          <dd className="mt-1 font-semibold text-accent">{study.outcome}</dd>
        </div>
      </dl>

      <div className="mt-12">
        <CaseStudyBody source={study.body} />
      </div>

      <nav className="mt-16 flex flex-wrap justify-between gap-4 border-t border-rule pt-8 font-semibold">
        <Link href="/" className="text-accent hover:underline">
          ← Home
        </Link>
        <Link href={`/work/${study.next.slug}`} className="text-accent hover:underline">
          Next: {study.next.title} →
        </Link>
      </nav>
    </main>
  );
}
