# syntax=docker/dockerfile:1

# Build context is the repository root:
#   docker build -f apps/backend/Dockerfile .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS builder

# Every workspace manifest, or --frozen-lockfile rejects a lockfile it cannot
# match against the projects it knows about.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
COPY packages/api-types/package.json packages/api-types/

RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @youjaymharah/backend...

COPY apps/backend apps/backend

# Production modules resolved from the lockfile rather than re-resolved inside
# .medusa/server, which has no lockfile of its own. Only node_modules is kept;
# the compiled output supplies everything else.
RUN --mount=type=cache,target=/pnpm/store \
    pnpm --filter @youjaymharah/backend deploy --prod --legacy /deps \
 && find /deps -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +

RUN pnpm --filter @youjaymharah/backend exec medusa build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=9000
ENV PATH=/app/node_modules/.bin:$PATH
WORKDIR /app

COPY --from=builder /deps/node_modules ./node_modules
COPY --from=builder /repo/apps/backend/.medusa/server/ ./
COPY apps/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R node:node /app

USER node
EXPOSE 9000

# Migrations, the catalogue reindex and boot take a while on a small instance.
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||9000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["medusa", "start"]
