import type { CaseStudy } from "@/content";

const SQL_KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "ORDER",
  "GROUP",
  "BY",
  "AND",
  "OR",
  "AS",
  "JOIN",
  "ON",
  "LIMIT",
]);

/** Splits a query on whitespace and colors the SQL keywords, keeping the spacing as written. */
function HighlightedQuery({ query }: { query: string }) {
  return query.split(/(\s+)/).map((part, i) =>
    SQL_KEYWORDS.has(part) ? (
      <span key={i} className="text-terminal-keyword">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** The hero's dark terminal: each Case study's SQL query and the headline result it returns. */
export function TerminalPanel({ caseStudies }: { caseStudies: CaseStudy[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-terminal font-mono text-sm text-terminal-text shadow-2xl">
      <div className="flex gap-1.5 border-b border-terminal-line px-4 py-3" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-terminal-line" />
        <span className="h-3 w-3 rounded-full bg-terminal-line" />
        <span className="h-3 w-3 rounded-full bg-terminal-line" />
      </div>
      <ol className="space-y-5 p-5">
        {caseStudies.map((study) => (
          <li key={study.slug}>
            <p className="text-xs break-words">
              <HighlightedQuery query={study.terminal.query} />
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-terminal-line pt-2">
              <span className="text-2xl font-bold text-terminal-accent">
                {study.terminal.value}
              </span>
              <span className="text-xs text-terminal-muted">{study.terminal.label}</span>
              <span className="ml-auto text-xs text-terminal-muted">{study.slug}</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
