import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { z } from "@medusajs/framework/zod";

import { ROUTES, TAGS, TYPES, type RouteDoc } from "./openapi-routes";

/**
 * Writes two artifacts for this project's custom API routes:
 * docs/api/openapi.json (the spec) and packages/api-types/index.d.ts (the
 * types the storefront imports).
 *
 *   pnpm run codegen            regenerate both
 *   pnpm run codegen -- --check  fail if either is out of date (CI)
 *
 * Medusa's built-in Store and Admin routes are already documented at
 * https://docs.medusajs.com/api -- this covers only what we added, and only
 * what the Zod validators in src/api/middlewares.ts actually enforce.
 *
 * The route list is checked against the files under src/api: a route with no
 * entry (or an entry with no route) fails the run rather than shipping a spec
 * that quietly disagrees with the server.
 */

const API_DIR = resolve(__dirname, "../src/api");
const OUTPUT = resolve(__dirname, "../../../docs/api/openapi.json");
const TYPES_OUTPUT = resolve(
  __dirname,
  "../../../packages/api-types/index.d.ts",
);
const METHODS = ["GET", "POST", "DELETE", "PUT"] as const;

/** Every `METHOD /path` the file-based router actually serves. */
function scanRoutes(): Set<string> {
  const found = new Set<string>();

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== "route.ts") {
        continue;
      }

      const urlPath =
        "/" +
        relative(API_DIR, dirname(full))
          .split("/")
          // Medusa's [id] segment is {id} in OpenAPI.
          .map((segment) => segment.replace(/^\[(.+)\]$/, "{$1}"))
          .join("/");

      const source = readFileSync(full, "utf8");
      for (const method of METHODS) {
        const exported = new RegExp(
          `export\\s+(const\\s+${method}\\b|async\\s+function\\s+${method}\\b)`,
        ).test(source);

        if (exported) {
          found.add(`${method} ${urlPath}`);
        }
      }
    }
  };

  walk(API_DIR);
  return found;
}

function assertRoutesMatchDocs() {
  const onDisk = scanRoutes();
  const documented = new Set(ROUTES.map((r) => `${r.method} ${r.path}`));

  const undocumented = [...onDisk].filter((r) => !documented.has(r)).sort();
  const stale = [...documented].filter((r) => !onDisk.has(r)).sort();

  if (undocumented.length || stale.length) {
    if (undocumented.length) {
      console.error(
        `Routes with no entry in scripts/openapi-routes.ts:\n  ${undocumented.join("\n  ")}`,
      );
    }
    if (stale.length) {
      console.error(
        `Documented routes that no longer exist:\n  ${stale.join("\n  ")}`,
      );
    }
    process.exit(1);
  }
}

/** Zod -> JSON Schema, without the $schema key OpenAPI does not want. */
function toSchema(schema: z.ZodType, io: "input" | "output") {
  const json = z.toJSONSchema(schema, {
    io,
    target: "draft-2020-12",
    unrepresentable: "any",
  }) as Record<string, unknown>;

  delete json.$schema;
  return json;
}

function securityFor(auth: RouteDoc["auth"]) {
  switch (auth) {
    case "admin":
      // Either an admin bearer token or the dashboard's session cookie.
      return [{ adminJwt: [] }, { adminSession: [] }];
    case "customer":
      // Both: every /store route needs the publishable key as well.
      return [{ publishableKey: [], customerJwt: [] }];
    default:
      return [{ publishableKey: [] }];
  }
}

function operationFor(route: RouteDoc) {
  const pathParams = [...route.path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
    name,
    in: "path" as const,
    required: true,
    description: `The ${name} of the resource.`,
    schema: { type: "string" },
  }));

  const queryParams = (route.query ?? []).map((param) => ({
    name: param.name,
    in: "query" as const,
    required: false,
    description: param.description,
    schema: toSchema(param.schema, "input"),
  }));

  const responses: Record<string, unknown> = {
    "200": {
      description: route.response.description,
      content: {
        "application/json": {
          schema: toSchema(route.response.schema, "output"),
        },
      },
    },
  };

  // Every operation can fail on auth, whether or not the route lists it:
  // admin tokens expire, and /store requests without a publishable key are
  // rejected before the handler runs.
  const defaults: RouteDoc["errors"] =
    route.auth === "admin"
      ? [
          {
            status: 401,
            description: "Missing or invalid admin token or session.",
          },
        ]
      : route.auth === "customer"
        ? [{ status: 401, description: "No customer is logged in." }]
        : [
            {
              status: 400,
              description: "Missing or invalid publishable API key.",
            },
          ];

  const listed = new Set((route.errors ?? []).map((e) => e.status));

  for (const error of [
    ...(route.errors ?? []),
    ...defaults.filter((e) => !listed.has(e.status)),
  ]) {
    responses[String(error.status)] = {
      description: error.description,
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/Error" } },
      },
    };
  }

  return {
    operationId: `${route.method.toLowerCase()}${route.path
      .replace(/[{}]/g, "")
      .split(/[/_-]/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join("")}`,
    tags: [route.tag],
    summary: route.summary,
    ...(route.description ? { description: route.description } : {}),
    ...(route.policies ? { "x-required-policies": route.policies } : {}),
    security: securityFor(route.auth),
    ...(pathParams.length || queryParams.length
      ? { parameters: [...pathParams, ...queryParams] }
      : {}),
    ...(route.body
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: toSchema(route.body, "input") },
            },
          },
        }
      : {}),
    responses,
  };
}

function buildSpec() {
  const { version, license } = JSON.parse(
    readFileSync(resolve(__dirname, "../package.json"), "utf8"),
  ) as { version: string; license: string };

  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of ROUTES) {
    paths[route.path] ??= {};
    paths[route.path][route.method.toLowerCase()] = operationFor(route);
  }

  const tags = [...new Set(ROUTES.map((r) => r.tag))].map((name) => ({
    name,
    ...(TAGS[name] ? { description: TAGS[name] } : {}),
  }));

  return {
    openapi: "3.1.0",
    info: {
      title: "Youjaymharah custom API",
      version,
      // SPDX identifier; OpenAPI 3.1 allows `identifier` or `url`, not both.
      license: { name: license, identifier: license },
      description: [
        "Endpoints added by this project, on top of the Medusa Store and Admin APIs.",
        "",
        "Medusa's own routes (products, carts, orders, customers, returns, ...) are",
        "documented separately and can be downloaded from:",
        "",
        "- Store: https://docs.medusajs.com/api/download/store",
        "- Admin: https://docs.medusajs.com/api/download/admin",
        "",
        "Every /store route also requires the `x-publishable-api-key` header.",
        "Admin routes marked with `x-required-policies` need those RBAC policies,",
        "which the Store Manager and Marketing roles already hold.",
      ].join("\n"),
    },
    servers: [
      {
        url: "{backendUrl}",
        variables: {
          backendUrl: {
            default: "http://localhost:9000",
            description: "Base URL of the Medusa backend.",
          },
        },
      },
    ],
    tags,
    paths,
    components: {
      securitySchemes: {
        publishableKey: {
          type: "apiKey",
          in: "header",
          name: "x-publishable-api-key",
          description: "Publishable API key for the sales channel.",
        },
        customerJwt: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Customer token from /auth/customer/emailpass.",
        },
        adminJwt: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Admin token from /auth/user/emailpass.",
        },
        adminSession: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description: "Session cookie used by the admin dashboard.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            type: { type: "string", description: "Medusa error type." },
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
  };
}

type JsonSchema = Record<string, unknown>;

/** JSON Schema -> TypeScript, for the small subset these schemas produce. */
function toTypeScript(schema: JsonSchema, indent = ""): string {
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  }

  if (Array.isArray(schema.anyOf)) {
    return (schema.anyOf as JsonSchema[])
      .map((entry) => toTypeScript(entry, indent))
      .join(" | ");
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array":
      return `${toTypeScript((schema.items ?? {}) as JsonSchema, indent)}[]`;
    case "object": {
      const properties = (schema.properties ?? {}) as Record<
        string,
        JsonSchema
      >;
      const required = new Set((schema.required as string[]) ?? []);
      const entries = Object.entries(properties);

      if (!entries.length) {
        return "Record<string, unknown>";
      }

      const inner = entries
        .map(([key, value]) => {
          const optional = required.has(key) ? "" : "?";
          // Trailing `;` keeps the emitted file identical to what Prettier
          // would produce, so `pnpm run format` cannot make codegen --check fail.
          return `${indent}  ${key}${optional}: ${toTypeScript(value, `${indent}  `)};`;
        })
        .join("\n");

      return `{\n${inner}\n${indent}}`;
    }
    default:
      return "unknown";
  }
}

function buildTypes() {
  const declarations = TYPES.map(({ name, schema, io }) => {
    const json = toSchema(schema, io);
    return `export type ${name} = ${toTypeScript(json)};\n`;
  });

  return [
    "// Generated by apps/backend/scripts/generate-openapi.ts -- do not edit.",
    "// Run `pnpm --dir apps/backend run codegen` after changing a validator.",
    "",
    ...declarations,
  ].join("\n");
}

function main() {
  assertRoutesMatchDocs();

  const spec = JSON.stringify(buildSpec(), null, 2) + "\n";
  const types = buildTypes();
  const check = process.argv.includes("--check");

  const artifacts: { path: string; contents: string; label: string }[] = [
    { path: OUTPUT, contents: spec, label: "docs/api/openapi.json" },
    {
      path: TYPES_OUTPUT,
      contents: types,
      label: "packages/api-types/index.d.ts",
    },
  ];

  if (check) {
    const stale = artifacts.filter((artifact) => {
      const current = existsSync(artifact.path)
        ? readFileSync(artifact.path, "utf8")
        : "";
      return current !== artifact.contents;
    });

    if (stale.length) {
      console.error(
        `Out of date: ${stale.map((s) => s.label).join(", ")}. Run \`pnpm run codegen\`.`,
      );
      process.exit(1);
    }

    console.log(`Up to date: ${artifacts.map((a) => a.label).join(", ")}.`);
    return;
  }

  for (const artifact of artifacts) {
    mkdirSync(dirname(artifact.path), { recursive: true });
    writeFileSync(artifact.path, artifact.contents);
  }

  console.log(
    `Wrote ${artifacts[0].label} (${ROUTES.length} operations) and ${artifacts[1].label} (${TYPES.length} types).`,
  );
}

main();
