# API reference

## This project's custom routes

`openapi.json` in this folder documents the endpoints this project adds on top
of Medusa: branding, newsletter and wishlist.

It is generated, not hand-written:

```bash
cd apps/backend
pnpm run codegen              # regenerate this spec + packages/api-types
pnpm run codegen -- --check   # fail if either is out of date (for CI)
```

The same run also emits `packages/api-types/index.d.ts`, the shared types the
storefront imports — see that package's README.

Request bodies come from the same Zod schemas the routes validate with
(`src/api/middlewares.ts`), so the spec cannot describe a body the server would
reject. The generator also compares the spec against the route files under
`src/api`: adding a route without documenting it (or documenting one that no
longer exists) fails the run. Edit `apps/backend/scripts/openapi-routes.ts` to
change summaries, responses or query parameters.

### Viewing it

Quickest, with nothing to install: paste the file into
<https://editor.swagger.io>, or import it into Postman or Insomnia
(**Import → File**) for a ready-made request collection.

To build a self-contained HTML page you can open or share:

```bash
# from the repo root
pnpm --package=@redocly/cli dlx redocly build-docs docs/api/openapi.json -o docs/api/index.html
```

The same tool validates the spec:

```bash
pnpm --package=@redocly/cli dlx redocly lint docs/api/openapi.json
```

Two gotchas with that package: `pnpm dlx @redocly/cli ...` fails with
`ERR_PNPM_DLX_MULTIPLE_BINS` because it ships two binaries (`redocly` and
`openapi`), hence the `--package=... dlx redocly` form above; and the old
`preview-docs` subcommand is gone — current versions have `build-docs` and
`preview` (the latter expects a Redocly project, not a single file).

`docs/api/index.html` is a build artefact: regenerate it when the spec changes,
or delete it.

## Medusa's built-in routes

Products, carts, orders, customers, returns and everything else that ships with
Medusa are documented by Medusa itself:

- Store API: <https://docs.medusajs.com/api/store> ([download](https://docs.medusajs.com/api/download/store))
- Admin API: <https://docs.medusajs.com/api/admin> ([download](https://docs.medusajs.com/api/download/admin))

Those specs track the latest Medusa release (2.20.1 at the time of writing),
which is slightly ahead of the 2.19 backend here, so a handful of endpoints may
not exist yet in this project.

For day-to-day work the typed JS SDK (`sdk.store.*`, `sdk.admin.*`) is usually
faster than reading the spec; the spec is most useful for the custom routes
above and for exploring in Postman.

## Authentication in short

- Every `/store` route needs the `x-publishable-api-key` header.
- Customer routes also need a customer bearer token (`/auth/customer/emailpass`).
- Admin routes need an admin bearer token (`/auth/user/emailpass`) or the
  dashboard's session cookie. Custom admin routes list the RBAC policies they
  require as `x-required-policies`.
