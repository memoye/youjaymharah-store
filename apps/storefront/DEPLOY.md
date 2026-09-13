# Deploy Notes — Storefront

## How the storefront talks to Medusa

- **Server Components** call Medusa directly with the server SDK
  (`lib/medusa/server.ts`), server to server.
- **The browser never calls Medusa.** Client Components use
  `getBrowserSdk()` (`lib/medusa/browser.ts`), which goes through this app's
  `/api/medusa` proxy. The proxy attaches the customer's token from an httpOnly
  cookie, so no token ever reaches browser JavaScript, and it forwards only
  `/store/*` routes.
- **Sign-in** runs in Route Handlers under `/api/auth/*`, which set and clear
  that cookie.

Because of this, the storefront and backend do **not** need to share a domain.

## Render

Create a Web Service from this repository, **in the same region as the
backend**. Proxied calls then travel over Render's private network.

| Setting        | Value                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Root directory | the repository root                                                                                 |
| Build command  | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @youjaymharah/storefront build` |
| Start command  | `pnpm --filter @youjaymharah/storefront exec next start -p $PORT`                                   |
| Node version   | from `.node-version` at the repository root                                                         |

Environment variables (see `.env.template`). **Set them before the first build:**
`NEXT_PUBLIC_*` values are baked into the build, not read at runtime.

| Variable                             | Value                                                               |
| ------------------------------------ | ------------------------------------------------------------------- |
| `MEDUSA_BACKEND_URL`                 | The backend's internal address, from its service's **Connect** menu |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | The "Web Storefront" key from `Settings › Publishable API Keys`     |

**Free tier:** like the backend, a free storefront service sleeps after 15
minutes idle, and the first visitor waits for it to start. The speed of the
private network only shows once both services are on always-on instances.

## Backend settings that depend on the storefront URL

Set these on the **backend** once the storefront has its URL:

| Variable               | Value                                           |
| ---------------------- | ----------------------------------------------- |
| `GOOGLE_CALLBACK_URL`  | `https://<storefront>/api/auth/google/callback` |
| `PAYMENT_CALLBACK_URL` | `https://<storefront>/checkout/callback`        |
| `STOREFRONT_URL`       | `https://<storefront>` (links in emails)        |

`STORE_CORS` does not need the storefront origin while all browser traffic goes
through the proxy. Add it only if Client Components ever call Medusa directly.

## Known gotchas

- **Sessions last one day.** The `_medusa_jwt` cookie matches Medusa's default
  `jwtExpiresIn` of `1d`, and nothing refreshes it, so customers sign in again
  daily. To lengthen it, raise `projectConfig.http.jwtExpiresIn` in the
  backend's `medusa-config.ts` and `AUTH_MAX_AGE_SECONDS` in
  `lib/medusa/session.ts` together.
- **Preview deployments** work without extra configuration: the browser SDK
  builds its URL from the page's own origin.
- **Measuring the proxy.** Every proxied response carries a `Server-Timing`
  header; the browser's Network tab shows how long Medusa took.
