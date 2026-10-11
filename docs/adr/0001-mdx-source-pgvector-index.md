# MDX is the content source; Postgres + pgvector is only a derived index

The site's content (case studies and the facts about Marcus) lives as schema-validated MDX files in the repo, and those files are the single source of truth. The planned RAG chat will search a Postgres + pgvector index, but that index is derived: an ingestion pipeline chunks and embeds the MDX files and can rebuild the index from them at any time. Content is never written to Postgres directly. We chose this because the pages are pre-rendered at build time, so a database would not make them faster. Storing the content in Postgres would add a container, migrations, backups and no comfortable way to edit prose, all for a handful of pages that change a few times a year.

## Considered Options

- **Postgres as the single store for content and embeddings**: rejected. It looks simpler ("everything in one place"), but it mixes the authored source with an index derived from it, and it makes the site depend on a running database.
- **Content hard-coded in TSX components**: rejected. The ingestion pipeline could not read it cleanly.

## Consequences

- Editing content means a commit and a deploy, not a database write.
- When the MDX changes, the RAG index must be re-ingested, or the chat will answer from stale text.
