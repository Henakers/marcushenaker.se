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

## Run the container

The site ships as a container image (`Dockerfile`, multi-stage on `node:24-alpine`, running as the non-root `node` user). `compose.yaml` runs it as the `web` service on `127.0.0.1:3001`, pulling `ghcr.io/henakers/portfolio:${IMAGE_TAG:-main}`.

To test a locally built image instead of the published one, add the `compose.build.yaml` override, which builds from this checkout. Set `IMAGE_TAG` so the local build never overwrites a pulled `main` image:

```sh
IMAGE_TAG=local docker compose -f compose.yaml -f compose.build.yaml up --detach --wait
curl http://127.0.0.1:3001/
IMAGE_TAG=local docker compose down
```

`--wait` returns once the healthcheck (a `node -e` fetch of `/`) passes. CI runs the same build and health check on every pull request and every push to `main`.

## Publish the image

The `publish` job in `.github/workflows/ci.yml` pushes the image to `ghcr.io/henakers/portfolio` after the `check` and `container` jobs pass. It runs only on `main`:

- on every push to `main`;
- weekly (Monday 04:17 UTC), rebuilding without the layer cache so base-image patches land without code changes;
- on demand through "Run workflow" (`workflow_dispatch`) on `main`.

Each publish tags the image `sha-<7-char commit SHA>` and `main`. There is no `latest` tag. Pull requests build and health-check the image but never push it.

Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm packages, the Docker base image (staying on Node 24) and GitHub Actions versions. They go through the same checks and are merged by hand.

### One-time setup (by hand)

1. **Make the GHCR package public.** After the first publish, open the `portfolio` package under the account's Packages, then Package settings → Danger Zone → Change visibility → Public, so the **Home server** can pull without credentials.
2. **Protect `main`.** In the repo's Settings → Branches (or Rules → Rulesets), add a rule for `main` that requires a pull request before merging and requires these status checks to pass: `check` and `container` (both from the `CI` workflow). Do not require `publish`: it is skipped on pull requests.

## Layout

- `content/`: the site's content as MDX with YAML frontmatter, the single source of truth (see `docs/adr/0001-mdx-source-pgvector-index.md`).
- `src/content/`: the content module. It loads and validates everything in `content/` and is the only thing pages read from.
- `src/app/`: the Next.js routes.
- `tests/site/`: the HTTP tests against the built site.
