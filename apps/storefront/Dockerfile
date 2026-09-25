# syntax=docker/dockerfile:1

# Build context is the repository root:
#   docker build -f apps/storefront/Dockerfile .
#
# Unlike the backend, this image is specific to one deployment: NEXT_PUBLIC_*
# values and IMAGE_REMOTE_URLS are compiled in, and `next build` prerenders
# pages from a running Medusa at MEDUSA_BACKEND_URL. At runtime the server
# reaches Medusa over the Docker network instead (see infra/compose.yaml).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS builder

# Every workspace manifest, or --frozen-lockfile rejects the lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
COPY packages/api-types/package.json packages/api-types/

RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @youjaymharah/storefront...

COPY packages/api-types packages/api-types
COPY apps/storefront apps/storefront

ARG MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG IMAGE_REMOTE_URLS
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0
ARG SENTRY_ORG
ARG SENTRY_PROJECT

# The Sentry token only uploads source maps; as a secret mount it never lands
# in a layer. Absent, the build still succeeds with minified stack traces.
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    NEXT_OUTPUT_STANDALONE=true pnpm --filter @youjaymharah/storefront build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Standalone output mirrors the workspace layout, so the server lives under
# apps/storefront. Static assets and public/ are not traced and are copied in.
# Owned by `node` because the server writes its ISR and image caches there.
COPY --from=builder --chown=node:node /repo/apps/storefront/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=node:node /repo/apps/storefront/public ./apps/storefront/public

USER node
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/storefront/server.js"]
