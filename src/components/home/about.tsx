import Image from "next/image";
import type { About as AboutContent } from "@/content";

export function About({ photo, paragraphs, location, skills, currentlyLearning }: AboutContent) {
  const [lead, ...rest] = paragraphs;

  return (
    <section id="about" className="border-t border-rule">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[14rem_1fr]">
        <Image
          src={photo.src}
          alt={photo.alt}
          width={224}
          height={224}
          className="size-56 rounded-xl bg-rule object-cover"
        />
        <div>
          <h2 className="text-3xl font-bold">About</h2>
          <p className="mt-5 text-xl font-semibold">{lead}</p>
          {rest.map((paragraph) => (
            <p key={paragraph} className="mt-3 leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
          <p className="mt-3 text-sm text-subtle">{location}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {Object.entries(skills).map(([group, items]) => (
              <div key={group}>
                <p className="font-mono text-xs text-faint">{group}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((skill) => (
                    <span
                      key={skill}
                      className="rounded border border-rule bg-white px-2 py-0.5 text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">Currently learning: {currentlyLearning}.</p>
        </div>
      </div>
    </section>
  );
}
