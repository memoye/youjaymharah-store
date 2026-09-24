# Production deployment

Everything needed to take this store from a laptop to a public domain, in the
order it should be done. Operational policy once it is live -- log retention,
backups, restore drills -- lives in [production-operations.md](./production-operations.md).

## Where each service runs

| Service              | Host                                               | Why there                                                                            | Monthly                                        |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Storefront (Next 16) | Cloudflare Workers, OpenNext adapter               | Same account as DNS and R2; SSR and ISR both supported                               | $0, or $5 if the bundle outgrows the free plan |
| Backend API (Medusa) | Fly.io, London (`lhr`)                             | Needs an always-on Node process for cron, subscribers and the in-memory search index | ~$6                                            |
| Admin dashboard      | Cloudflare Workers static assets, `admin.<domain>` | A static bundle on the edge; keeps dashboard traffic off the backend host            | $0                                             |
| Postgres             | Neon, `eu-west-2`                                  | Free tier is enough at this catalogue size                                           | $0                                             |
| Redis                | Upstash, `eu-west-2`                               | Event bus, workflow engine, cache, locks, admin sessions                             | $0                                             |
| Files                | Cloudflare R2                                      | No egress charges, same account as the domain                                        | $0                                             |
| Email                | Resend                                             | 3,000/month free                                                                     | $0                                             |

**Put the backend, Neon and Upstash in the same city.** London keeps
backend-to-database hops at single-digit milliseconds while sitting ~90 ms from
Lagos. A US region doubles shopper latency on cart and checkout; splitting the
three across regions is worse than either.

### Why not the GCP free tier

An e2-micro is free in `us-west1`, `us-central1` and `us-east1`, but Google
bills in-use external IPv4 addresses at $0.005/hour -- about **$3.65/month** --
and a VM without one cannot reach Neon, Upstash or a registry without Cloud NAT
at roughly $32/month. So the real comparison is $3.65 plus your own ops, 1 GB of
RAM and a US-only region, against ~$6 for a managed machine in London. Appendix
A covers the GCE path anyway, because the Dockerfile and workflow are identical.

---

## Phase 1 -- Domain

1. Buy the domain through **Cloudflare Registrar** (at-cost, and DNS is wired up
   for you). Existing domain elsewhere: add the site to Cloudflare and move the
   nameservers first.
2. Names used throughout this guide:
   - `example.com` -- storefront
   - `www.example.com` -- redirect to apex
   - `api.example.com` -- backend and, to begin with, the admin dashboard
   - `admin.example.com` -- the admin dashboard
3. Under SSL/TLS, set the mode to **Full (strict)**.

## Phase 2 -- Data services

Create these before the backend; it needs their credentials to boot.

4. **Neon** -- new project in `eu-west-2`. Copy the _pooled_ connection string
   into `DATABASE_URL`. The free tier autosuspends after inactivity, so the
   first request after a quiet spell is slow; that is normal.
5. **Upstash Redis** -- database in the same region. Set the eviction policy to
   **`noeviction`**: this Redis holds workflow state and admin sessions, and
   evicting either silently breaks them. Copy the `rediss://` URL into
   `REDIS_URL`. Watch the command counter in week one -- five subsystems share
   this instance and the free allowance is the first thing likely to run out.
6. **R2** -- create a bucket, then an S3-compatible API token. That gives
   `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` and
   `S3_REGION` (`auto`). `S3_FILE_URL` is the bucket's public URL -- attach a
   custom domain such as `files.example.com` rather than using `*.r2.dev`, so
   the URLs already stored against products never have to change.
7. **Resend** -- verify the sending domain (the DNS records go into Cloudflare),
   create an API key, and set `RESEND_FROM_EMAIL` to an address on that domain.
   Delivery-event webhooks are covered in [resend-webhooks.md](./resend-webhooks.md).

## Phase 3 -- Secrets

8. Generate the four the backend signs and encrypts with:

   ```sh
   openssl rand -hex 32   # JWT_SECRET
   openssl rand -hex 32   # COOKIE_SECRET
   openssl rand -hex 32   # EMAIL_DELIVERY_ENCRYPTION_KEY (must be 64 hex chars)
   openssl rand -hex 32   # AUTH_MFA_ENCRYPTION_KEY
   ```

   Keep them in the host's secret store, never in the repository. The full list
   of variables is in `apps/backend/.env.template`.

9. CORS, which is what usually breaks first:

   ```sh
   STORE_CORS=https://example.com
   ADMIN_CORS=https://admin.example.com
   AUTH_CORS=https://example.com,https://admin.example.com
   STOREFRONT_URL=https://example.com
   ADMIN_URL=https://admin.example.com
   ADMIN_DISABLED=true
   MEDUSA_BACKEND_URL=https://api.example.com
   ```

## Phase 4 -- Backend on Fly.io

The image is built from `apps/backend/Dockerfile`, whose context is the
repository root.

10. From the repository root:

    ```sh
    fly launch --no-deploy --dockerfile apps/backend/Dockerfile --name youjaymharah-api --region lhr
    ```

11. Edit `fly.toml` so the machine never stops -- a stopped machine misses cron
    runs and drops the search index:

    ```toml
    [http_service]
      internal_port = 9000
      force_https = true
      auto_stop_machines = false
      auto_start_machines = true
      min_machines_running = 1

    [[http_service.checks]]
      grace_period = "180s"
      interval = "30s"
      method = "GET"
      path = "/health"
      timeout = "5s"

    [[vm]]
      size = "shared-cpu-1x"
      memory = "1gb"
    ```

12. Set the secrets (`fly secrets set KEY=value ...`) for everything in Phase 2
    and 3, plus `REDIS_PREFIX=youjaymharah:` and the payment keys.

13. `fly deploy`. The container entrypoint runs `medusa db:migrate` before
    starting, so the first boot creates the schema. Watch it with `fly logs`.

14. Point the domain at it:

    ```sh
    fly certs add api.example.com
    ```

    Add the CNAME Fly prints, **DNS-only (grey cloud)** until the certificate is
    issued. Once `fly certs show` reports it ready you may turn the proxy on.

15. The first `medusa db:migrate` also runs `src/migration-scripts/initial-data-seed.ts`,
    which creates what a store cannot boot without: the default sales channel, a
    publishable API key, NGN and USD currencies, the Lagos region and stock
    location, the search vocabulary -- and, if `ADMIN_EMAIL` and `ADMIN_PASSWORD`
    are set, the first Super Admin. Set those two before the first deploy and
    remove them afterwards; the script skips a user that already exists.

    The publishable key token is printed once during that run, and it is what
    the storefront authenticates with:

    ```sh
    fly logs | grep "Publishable API key token"
    ```

    Without `ADMIN_EMAIL`/`ADMIN_PASSWORD`, create the user by hand instead:

    ```sh
    fly ssh console -C "medusa user -e you@example.com -p 'a-strong-password'"
    ```

## Phase 5 -- Storefront on Cloudflare Workers

Cloudflare's own default is now `vinext`, which is in beta and reimplements the
Next.js API surface on Vite. `npx vinext check` scores this storefront at 87%:
one auto-fixable issue, image optimisation no better or worse than OpenNext, and
`getImageProps` supported, so the art-directed hero survives. It was passed over
for two reasons -- `next/font/google` loads from a CDN instead of self-hosting
Bodoni and Instrument Sans at build time, which costs brand typography a
third-party round trip and a flash of fallback type, and build-time static
pre-rendering is still on its roadmap. Revisit when both land; `vinext init` is
non-destructive and leaves `next dev` working, so the spike stays cheap.

16. In `apps/storefront`:

    ```sh
    pnpm add -D @opennextjs/cloudflare wrangler
    ```

17. Add `wrangler.jsonc` beside `next.config.ts`:

    ```jsonc
    {
      "name": "youjaymharah-storefront",
      "main": ".open-next/worker.js",
      "compatibility_date": "2026-09-01",
      "compatibility_flags": ["nodejs_compat"],
      "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
    }
    ```

    and `open-next.config.ts`:

    ```ts
    import { defineCloudflareConfig } from "@opennextjs/cloudflare";

    export default defineCloudflareConfig();
    ```

18. Build and deploy commands, from the repository root:

    ```sh
    pnpm install --frozen-lockfile
    pnpm --filter @youjaymharah/storefront exec opennextjs-cloudflare build
    pnpm --filter @youjaymharah/storefront exec opennextjs-cloudflare deploy
    ```

    In the Cloudflare dashboard (Workers -> Builds) point the project at the
    repository with the root directory `apps/storefront` and those same
    commands, so pushes to `main` deploy themselves.

19. Variables. `NEXT_PUBLIC_*` are inlined at build time, so they must be set on
    the build, not only at runtime:

    ```sh
    MEDUSA_BACKEND_URL=https://api.example.com
    NEXT_PUBLIC_BASE_URL=https://example.com
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
    IMAGE_REMOTE_URLS=https://files.example.com
    ```

20. Attach the domain: add `example.com` as a custom domain on the Worker, and a
    redirect rule sending `www.example.com/*` to `https://example.com/$1`.

21. **Two caveats.** Cloudflare's free plan caps a Worker at 3 MiB compressed --
    if the build exceeds it, Workers Paid is $5/month. And Next's image
    optimiser needs Cloudflare Images to run on Workers; until that is set up,
    set `images.unoptimized = true` in `next.config.ts` and let R2 serve the
    files directly. Phones then download desktop-sized images, so revisit it
    before you push traffic at the site.

## Phase 6 -- Admin dashboard

The dashboard is a static single-page app that talks to the API over CORS.
`ADMIN_DISABLED=true` on the backend means the server never builds or serves it,
which also keeps its assets off the backend's bandwidth.

22. Add repository **variables** `MEDUSA_BACKEND_URL` (`https://api.example.com`)
    and `STOREFRONT_URL` (`https://example.com`), and repository **secrets**
    `CLOUDFLARE_API_TOKEN` (Workers deploy permission) and
    `CLOUDFLARE_ACCOUNT_ID`. `MEDUSA_BACKEND_URL` is compiled into the bundle,
    so it must be right at build time; changing it later needs a rebuild.

23. The `admin` job in `.github/workflows/backend.yml` runs
    `pnpm run build:admin` (`medusa build --admin-only`, output `.medusa/admin`)
    and deploys it with `apps/backend/deploy/admin/wrangler.jsonc`, which serves
    the directory with `not_found_handling: "single-page-application"` so deep
    links resolve. To do it by hand:

    ```sh
    ADMIN_DISABLED=true MEDUSA_BACKEND_URL=https://api.example.com \
      pnpm --filter @youjaymharah/backend run build:admin
    pnpm --filter @youjaymharah/backend exec wrangler deploy \
      --config deploy/admin/wrangler.jsonc
    ```

24. In the Cloudflare dashboard, attach `admin.example.com` to the
    `youjaymharah-admin` Worker.

25. `ADMIN_URL` is the dashboard's own base URL, because invite and staff
    password-reset emails build their links from it. On this layout it is
    `https://admin.example.com`; if you ever move the dashboard back onto the
    backend it becomes `https://api.example.com/app`, path included.

    The session cookie is set by `api.example.com`, and `admin.example.com` is a
    different origin but the _same site_, so the default `SameSite=Lax` cookie is
    still sent -- `ADMIN_CORS` and `AUTH_CORS` are all that is needed. Attach the
    custom domain before testing sign-in: a `*.workers.dev` preview is a
    different site, and only then would you need `sessionOptions.cookieOptions`
    with `sameSite: "none"`.

## Phase 7 -- Continuous deployment

The workflow in `.github/workflows/backend.yml` already lints, type-checks,
builds and migrates a throwaway database on every push. Its `image` and `deploy`
jobs run only on `main`.

26. On Fly, replace the two SSH steps with:

    ```yaml
    - uses: superfly/flyctl-actions/setup-flyctl@master
    - run: flyctl deploy --remote-only --config apps/backend/fly.toml
      env:
        FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
    ```

    On a VM, keep the shipped steps and set `DEPLOY_HOST`, `DEPLOY_USER` and
    `DEPLOY_SSH_KEY` as repository secrets.

27. Rolling back is redeploying a known-good tag: `fly releases` then
    `fly deploy --image <previous>`, or on a VM
    `BACKEND_IMAGE=ghcr.io/<owner>/<repo>/backend:<sha> docker compose up -d`.

## Phase 8 -- Error tracking and uptime

28. Create two Sentry projects (Node for the backend, Next.js for the
    storefront). Both SDKs are inert without a DSN, so development and CI stay
    silent.

    - Backend: `SENTRY_DSN` on the host. `instrumentation.ts` initialises it
      before the server boots, and the `errorHandler` in
      `src/api/middlewares.ts` reports 5xx responses. Expected 4xx errors --
      validation, not found, unauthorised -- are filtered out, and query
      strings are never attached: they carry search terms and one-time tokens.
    - Storefront: `NEXT_PUBLIC_SENTRY_DSN` (public by design, and needed in the
      browser). For readable stack traces also set `SENTRY_ORG`,
      `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` on the build, which uploads
      source maps and deletes them afterwards.

    Tracing and session replay are both off (`0`). Replay records what shoppers
    type, which needs a consent story first.

29. Set the repository variable `HEALTH_URL` to
    `https://api.example.com/health`. `.github/workflows/uptime.yml` probes it
    every 15 minutes and opens (or comments on) an issue labelled `uptime` when
    it fails.

    Treat that as a backstop, not monitoring: GitHub delays scheduled runs under
    load and disables them after 60 days of repository inactivity. Add an
    external monitor -- UptimeRobot's free tier is enough -- pointing at the
    same URL.

30. Prove both work before you need them: stop the backend briefly and confirm
    an issue appears, and throw once from a route to confirm Sentry receives it.

## Phase 9 -- Before you call it live

- [ ] Error tracking and an uptime check are wired up and have fired once in
      anger, so you know they work.
- [ ] A test order end to end, including the payment callback URLs.
- [ ] Order confirmation, cart reminder and password reset emails all arrive.
- [ ] `robots.txt` and `sitemap.xml` reflect the real domain, and
      `allow_indexing` is on in admin.
- [ ] Neon backups and the restore drill in
      [production-operations.md](./production-operations.md).
- [ ] An uptime check on `https://api.example.com/health`.
- [ ] Upstash command usage checked after a week of real traffic.

---

## Appendix A -- Backend on a GCE e2-micro

Same image, same workflow; you supply the machine.

1. Create an **e2-micro** in `us-east1` (Debian 12, 30 GB standard disk). Under
   networking set the **Standard** network tier -- 200 GiB of free egress a
   month against Premium's 1 GiB.
2. Add swap, because 1 GB of RAM is not enough on its own:

   ```sh
   sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

3. Install Docker, create `/opt/youjaymharah` owned by the deploy user, and put
   the environment from Phases 2-3 in `/opt/youjaymharah/.env`.
4. Never build on the box -- `medusa build` bundles the admin dashboard and
   wants more than 1 GB. The GitHub workflow builds the image; the VM only
   pulls it.
5. Front it with a Cloudflare Tunnel, so nothing is exposed and there are no
   certificates to renew:

   ```sh
   cloudflared tunnel create youjaymharah
   cloudflared tunnel route dns youjaymharah api.example.com
   ```

   Point the tunnel at `http://localhost:9000`, which is where
   `apps/backend/deploy/docker-compose.yml` binds the container.

6. Set a budget alert in GCP. Budgets only notify -- they do not stop spending --
   so treat the alert as the signal to act.
