# syntax=docker/dockerfile:1

# Build context is the repository root. Two images come out of this file:
#
#   docker build -f apps/backend/Dockerfile --target server .
#     Medusa, for both the HTTP server and the worker. Contains no URL, domain
#     or secret, so one image serves every deployment.
#
#   docker build -f apps/backend/Dockerfile --target admin \
#     --build-arg MEDUSA_BACKEND_URL=https://api.example.com \
#     --build-arg STOREFRONT_URL=https://example.com .
#     The dashboard as static files for admin.<domain>. The API URL is compiled
#     into the bundle, so this image belongs to one deployment.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS deps

# Every workspace manifest, or --frozen-lockfile rejects a lockfile it cannot
# match against the projects it knows about.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
COPY packages/api-types/package.json packages/api-types/

RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @youjaymharah/backend...

COPY apps/backend apps/backend

FROM deps AS server-build

# Production modules resolved from the lockfile rather than re-resolved inside
# .medusa/server, which has no lockfile of its own. Only node_modules is kept;
# the compiled output supplies everything else.
RUN --mount=type=cache,target=/pnpm/store \
    pnpm --filter @youjaymharah/backend deploy --prod --legacy /deps \
 && find /deps -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +

# The binary is called directly: `pnpm exec` re-verifies the install first and
# tries to reinstall after the `pnpm deploy` above.
WORKDIR /repo/apps/backend
RUN ADMIN_DISABLED=true node_modules/.bin/medusa build

FROM deps AS admin-build
ARG MEDUSA_BACKEND_URL
ARG STOREFRONT_URL
WORKDIR /repo/apps/backend
RUN test -n "$MEDUSA_BACKEND_URL" || { echo "MEDUSA_BACKEND_URL is required" >&2; exit 1; }
# Built for the root of its own hostname (admin.<domain>) rather than /app.
RUN ADMIN_DISABLED=true ADMIN_PATH=/ node_modules/.bin/medusa build --admin-only

FROM base AS server
ENV NODE_ENV=production
ENV PORT=9000
ENV ADMIN_DISABLED=true
ENV PATH=/app/node_modules/.bin:$PATH
WORKDIR /app

COPY --from=server-build --chown=node:node /deps/node_modules ./node_modules
COPY --from=server-build --chown=node:node /repo/apps/backend/.medusa/server/ ./

USER node
EXPOSE 9000

# Medusa listens once every module, the database and Redis are loaded; in
# worker mode it still answers /health, just no API routes.
HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||9000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations are a separate deploy step (infra/deploy.sh), never part of boot.
CMD ["medusa", "start"]

FROM caddy:2.10-alpine AS admin
COPY apps/backend/deploy/admin/Caddyfile /etc/caddy/Caddyfile
COPY --from=admin-build /repo/apps/backend/.medusa/admin /srv
# Caddy only reads here; the writable dirs it wants are redirected to /tmp so
# the container can run as an unprivileged user on a read-only filesystem.
ENV XDG_CONFIG_HOME=/tmp/config XDG_DATA_HOME=/tmp/data
USER 65534:65534
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
