import type { Contact } from "@/content";

const buttonClass =
  "flex-1 rounded-lg border border-terminal-line px-5 py-3 text-center font-semibold text-white hover:border-terminal-accent";

/** The dark "Let's talk." band. The address is plain text so it can be selected and copied. */
export function ContactBand({ heading, availability, email, linkedin, github, cvLabel }: Contact) {
  return (
    <section id="contact" className="bg-terminal text-terminal-text">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold text-white">{heading}</h2>
          <p className="mt-4 leading-relaxed">{availability}</p>
        </div>
        <div className="space-y-3">
          <p className="rounded-lg border border-terminal-line bg-terminal-raised px-5 py-4 font-mono break-all text-white">
            <span aria-hidden="true" className="text-terminal-accent select-none">
              ${" "}
            </span>
            <span className="select-all">{email}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${email}`} className={buttonClass}>
              Email
            </a>
            <a href={linkedin} className={buttonClass}>
              LinkedIn
            </a>
            <a href={github} className={buttonClass}>
              GitHub
            </a>
            <a href="/Marcus-Henaker-CV.pdf" className={buttonClass}>
              {cvLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
