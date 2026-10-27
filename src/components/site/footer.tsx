import type { Footer as FooterContent } from "@/content";

/** Dark footer under every page. On the home page it continues the dark contact band. */
export function Footer({ hostingNote, repoUrl, copyright }: FooterContent) {
  return (
    <div className="bg-terminal">
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-terminal-line px-6 py-8 text-xs text-terminal-muted">
        <a href={repoUrl} className="hover:text-terminal-accent">
          {hostingNote} ↗
        </a>
        <span>{copyright}</span>
      </footer>
    </div>
  );
}
