import { MedusaError } from "@medusajs/framework/utils";

export function validateProductionEnvironment(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== "production") return;
  if (!env.REDIS_URL?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Production requires REDIS_URL for durable workflows, shared sessions, caching, and locks.",
    );
  }
  for (const name of ["JWT_SECRET", "COOKIE_SECRET"] as const) {
    if ((env[name]?.length ?? 0) < 32) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Production requires a strong ${name} of at least 32 characters.`,
      );
    }
  }
}

export default async function productionSafety() {
  validateProductionEnvironment(process.env);
}
