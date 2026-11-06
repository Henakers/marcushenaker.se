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
pnpm test         # seam 1: the content module against fixture content; also the CV PDF
                  # and the deploy script (run with bash against fake docker and curl)
pnpm build        # next build; also fails on invalid or missing content
pnpm test:e2e     # seam 2: starts the built standalone server and checks it over HTTP
```

`pnpm test:e2e` needs a fresh `pnpm build` first. CI runs all of the above on every pull request and every push to `main`.

## Build and run the production server

```sh
pnpm build
pnpm start        # runs .next/standalone/server.js on port 3000
```

## Regenerate the CV

The CV goes through the content module like the rest of the site: `content.cv()` assembles it, so the CV always matches the site. `content/cv/cv.md` (YAML frontmatter only) holds only what the CV alone says: the summary, experience, education and any code links for the case studies. The name, Title, contact details, location, skills and the case studies (titles, results and links) come from `content/home.mdx` and `content/case-studies/`. `pnpm build` validates the CV source along with the other content.

The site serves the generated PDF at `/Marcus-Henaker-CV.pdf` (`CV_PATH` in `src/content/index.ts`) from `public/`. Regenerate it by hand whenever a case-study number, role or skill changes, then commit the PDF:

```sh
pnpm cv           # writes public/Marcus-Henaker-CV.pdf
```

`pnpm cv` installs Playwright's Chromium on first use (no Docker needed), renders the CV as an HTML page in IBM Plex Sans (`scripts/build-cv.ts`, layout only) and prints it to one A4 page with real, selectable text. The footer's "Updated <month year>" is the date you run it. CI never builds the CV; `pnpm test` checks the committed PDF by extracting its text (one A4 page, the standard headings, the case-study URLs, the footer, and the current name, Title, case-study results and skills, so a stale PDF fails until you rerun `pnpm cv`).

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

### One-time publish setup (by hand)

1. **Make the GHCR package public.** After the first publish, open the `portfolio` package under the account's Packages, then Package settings → Danger Zone → Change visibility → Public, so the **Home server** can pull without credentials.
2. **Protect `main`.** In the repo's Settings → Branches (or Rules → Rulesets), add a rule for `main` that requires a pull request before merging and requires these status checks to pass: `check` and `container` (from the `CI` workflow). Do not require `publish` or `Mirror main to the public repo`: they are skipped on pull requests.

## Deploy on the Home server

`deploy/` holds the reference copy of the deploy script and its systemd units. Nothing installs them automatically: copy them to the **Home server** by hand.

Every 5 minutes `portfolio-deploy.timer` starts `portfolio-deploy.service`, which runs `deploy.sh`:

1. It records the digest of the running `web` container, then runs `docker compose pull --quiet web`. If the pull fails, or the pulled image's digest cannot be read, it sends an ntfy push and exits non-zero, leaving the running container alone.
2. If the pulled digest is the one already running, it stops there. A new digest without a code change (the weekly rebuild) is a normal deploy.
3. Otherwise it runs `docker compose up --detach --wait`, which relies on the healthcheck in `compose.yaml`, with a 60 s limit.
4. If the new container is not healthy in time, it restarts the previous digest (`IMAGE_TAG=<tag>@sha256:...` for that one run, so `compose.yaml` stays the source of the service's configuration), marks the new digest bad, sends an ntfy push and exits non-zero. Later runs skip a bad digest until a newer image is published.

Digests are compared by repo digest, not image ID, because `:main` is a manifest list. For both the running container's image and the pulled `:main`, the script takes the first line of `docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}'` and keeps the `sha256:...` part after the `@`. A dry run takes the pulled side from the registry instead (`{{.Manifest.Digest}}` from `docker buildx imagetools inspect`).

### Install (by hand)

From a checkout of the public repo on the server, after reading the files:

```sh
sudo install -m 755 deploy/deploy.sh /usr/local/bin/portfolio-deploy
sudo install -m 644 deploy/portfolio-deploy.service deploy/portfolio-deploy.timer /etc/systemd/system/
sudo install -m 600 deploy/portfolio-deploy.env.example /etc/portfolio-deploy.env
sudoedit /etc/portfolio-deploy.env   # COMPOSE_DIR and the private ntfy topic URL
sudo systemctl daemon-reload
sudo bash -c 'set -a; . /etc/portfolio-deploy.env; portfolio-deploy --dry-run'
sudo systemctl start portfolio-deploy.service   # one real run, as the timer does it
sudo systemctl enable --now portfolio-deploy.timer
```

The env file holds the server's configuration, which never goes in the repo:

- `COMPOSE_DIR` (required): the directory holding the server's `compose.yaml` and `.env`.
- `NTFY_URL`: the ntfy topic URL for failure pushes. Without it, failures only reach the journal.
- `WAIT_TIMEOUT` (default 60) and `SERVICE` (default `web`).

Bad digests are kept in `/var/lib/portfolio-deploy/bad-digests` (systemd's `StateDirectory`). Delete a line to let the script try that digest again.

`--dry-run` asks the registry for the current digest (`docker buildx imagetools inspect`) instead of pulling, and prints what a real run would do without changing anything. Only systemd reads the env file (`EnvironmentFile=`), so any run outside it, like the dry run above, loads the file first with `set -a; . /etc/portfolio-deploy.env`; without it the script stops at the missing `COMPOSE_DIR`.

Follow runs with `journalctl -u portfolio-deploy.service` and see the next run with `systemctl list-timers portfolio-deploy.timer`.

### What is not automatic

Only the image updates by itself. Changes to `compose.yaml`, the deploy script and the units are applied by hand: pull the public repo on the server, read the diff (`git diff HEAD@{1} -- compose.yaml deploy/`), then copy the files into place and run `docker compose up --detach --wait` or reinstall the script and units as above.

After a rollback the previous digest keeps running, but `compose.yaml` still points at `:main`, the bad digest. A manual `docker compose up` would start it again. Pin a good version with `IMAGE_TAG=sha-<7 chars>` in the server's `.env` until a fixed image is published.

## Public code mirror

This repo stays private. On every push to `main`, the `Mirror` workflow (`.github/workflows/mirror.yml`) pushes `main` with its full history to the public, code-only repo [Henakers/marcushenaker.se](https://github.com/Henakers/marcushenaker.se). Only `main` is mirrored; other branches stay here.

Nothing checks what is mirrored: whatever lands on `main`, including its history and commit messages, becomes public.

### One-time setup (by hand)

1. Create the public repo `Henakers/marcushenaker.se`, empty (no README, license or `.gitignore`), so the first push of `main` fast-forwards.
2. Generate a key pair for the mirror only: `ssh-keygen -t ed25519 -N "" -C "portfolio mirror" -f mirror_key`.
3. In `Henakers/marcushenaker.se` → Settings → Deploy keys, add `mirror_key.pub` with **Allow write access** ticked.
4. In this repo → Settings → Secrets and variables → Actions, add `MIRROR_DEPLOY_KEY`: the contents of the private key `mirror_key`.
5. Delete both key files locally.

## Layout

- `content/`: the site's content as MDX with YAML frontmatter, the single source of truth (see `docs/adr/0001-mdx-source-pgvector-index.md`).
- `src/content/`: the content module. It loads and validates everything in `content/` and is the only thing pages read from.
- `src/app/`: the Next.js routes.
- `tests/site/`: the HTTP tests against the built site.
- `content/cv/`: what only the CV says; with the home and case-study content it is rendered to `public/Marcus-Henaker-CV.pdf` by `pnpm cv`.
- `scripts/`: build helpers and the CV renderer, with the CV test.
- `deploy/`: the reference copy of the **Home server**'s deploy script and systemd units, with tests against fake `docker` and `curl` commands.
