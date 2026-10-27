# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install dependencies exactly as locked; pnpm comes from the version pinned in package.json.
FROM base AS deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# `next build` directly (not `pnpm build`): the runner stage copies the static and public
# assets itself, so the postbuild copy into the standalone output is not needed here.
RUN mkdir -p public && pnpm exec next build

# Only the standalone server, its static assets and the public assets reach the final image.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
