# portfolio

Marcus Henåker's portfolio site: a Next.js app (App Router, standalone output) styled with Tailwind CSS v4.

## Requirements

- Node 24 LTS
- pnpm (the version is pinned in `package.json`; run `corepack enable` to get it)

## Run locally

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

## Test

```sh
pnpm lint         # ESLint and Prettier
pnpm typecheck    # TypeScript, strict
pnpm test         # seam 1: the content module against fixture content
pnpm build        # next build; also fails on invalid or missing content
pnpm test:e2e     # seam 2: starts the built standalone server and checks it over HTTP
```

`pnpm test:e2e` needs a fresh `pnpm build` first. CI runs all of the above on every pull request and every push to `main`.

## Build and run the production server

```sh
pnpm build
pnpm start        # runs .next/standalone/server.js on port 3000
```

## Layout

- `content/`: the site's content as MDX with YAML frontmatter, the single source of truth (see `docs/adr/0001-mdx-source-pgvector-index.md`).
- `src/content/`: the content module. It loads and validates everything in `content/` and is the only thing pages read from.
- `src/app/`: the Next.js routes.
- `tests/site/`: the HTTP tests against the built site.
