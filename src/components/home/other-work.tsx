import Image from "next/image";
import type { OtherWorkEntry } from "@/content";

/** A ruled list of Other work, deliberately lighter than the Featured project cards above it. */
export function OtherWork({ entries }: { entries: OtherWorkEntry[] }) {
  return (
    <>
      <h3 className="mt-14 text-lg font-bold">Other work</h3>
      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {entries.map((entry) => (
          <li key={entry.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <span className="font-semibold">{entry.name}</span>
            <span className="flex-1 text-sm text-muted">{entry.line}</span>
            <span className="flex gap-1.5">
              {entry.tags.map((tag) => (
                <span key={tag} className="rounded bg-chip px-2 py-1 font-mono text-xs">
                  {tag}
                </span>
              ))}
            </span>
            <a href={entry.github} className="text-sm font-semibold text-accent">
              GitHub
            </a>
            {entry.live && (
              <a href={entry.live} className="text-sm font-semibold text-accent">
                Live
              </a>
            )}
            {entry.image && (
              <Image
                src={entry.image.src}
                alt={entry.image.alt}
                width={320}
                height={200}
                className="mt-2 basis-full rounded-lg border border-rule object-cover sm:basis-auto"
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
