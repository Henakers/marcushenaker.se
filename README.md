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
pnpm test         # seam 1: the content module against fixture content; also the banned-words guard
pnpm build        # next build; also fails on invalid or missing content
pnpm test:e2e     # seam 2: starts the built standalone server and checks it over HTTP
```

`pnpm test:e2e` needs a fresh `pnpm build` first. CI runs all of the above on every pull request and every push to `main`.

## Build and run the production server

```sh
pnpm build
pnpm start        # runs .next/standalone/server.js on port 3000
```

## Run the container

The site ships as a container image (`Dockerfile`, multi-stage on `node:24-alpine`, running as the non-root `node` user). `compose.yaml` runs it as the `web` service on `127.0.0.1:3001`, pulling `ghcr.io/henakers/portfolio:${IMAGE_TAG:-main}`.

To test a locally built image instead of the published one, add the `compose.build.yaml` override, which builds from this checkout. Set `IMAGE_TAG` so the local build never overwrites a pulled `main` image:

```sh
IMAGE_TAG=local docker compose -f compose.yaml -f compose.build.yaml up --detach --wait
curl http://127.0.0.1:3001/
IMAGE_TAG=local docker compose down
```

`--wait` returns once the healthcheck (a `node -e` fetch of `/`) passes. CI runs the same build and health check on every pull request and every push to `main`.

## Public code mirror

This repo stays private. On every push to `main`, the `Mirror` workflow (`.github/workflows/mirror.yml`) pushes `main` with its full history to the public, code-only repo [Henakers/marcushenaker.se](https://github.com/Henakers/marcushenaker.se). Only `main` is mirrored; other branches stay here.

The mirror only runs after the banned-words guard (`scripts/banned-words-guard.ts`) passes. The guard scans file contents, file paths and commit messages across the whole history of `main`, case-insensitively. The only exemption is the content of `public/Marcus-Henaker-CV.pdf`. It reports where a hit is (file and commit, or only the commit when the path itself is the hit) and never prints the banned words. It fails when the word list is empty. The guard also runs on pull requests and can be started by hand on any branch from the Actions tab.

Run it locally:

```sh
BANNED_WORDS="first,second" node scripts/banned-words-guard.ts
```

### One-time setup (by hand)

1. Create the public repo `Henakers/marcushenaker.se`, empty (no README, licence or `.gitignore`), so the first push of `main` fast-forwards.
2. Generate a key pair for the mirror only: `ssh-keygen -t ed25519 -N "" -C "portfolio mirror" -f mirror_key`.
3. In `Henakers/marcushenaker.se` → Settings → Deploy keys, add `mirror_key.pub` with **Allow write access** ticked.
4. In this repo → Settings → Secrets and variables → Actions, add:
   - `MIRROR_DEPLOY_KEY`: the contents of the private key `mirror_key`.
   - `BANNED_WORDS`: the banned words, one per line or comma-separated (case does not matter).
5. Delete both key files locally.
6. Prove the guard once: push a branch with a planted banned word, open a pull request, check that the `Banned-words guard` job fails without printing the word, and link that run from the pull request. Then delete the branch.

## Layout

- `content/`: the site's content as MDX with YAML frontmatter, the single source of truth (see `docs/adr/0001-mdx-source-pgvector-index.md`).
- `src/content/`: the content module. It loads and validates everything in `content/` and is the only thing pages read from.
- `src/app/`: the Next.js routes.
- `tests/site/`: the HTTP tests against the built site.
- `scripts/`: build helpers and the banned-words guard, with its tests against throwaway git repos.
