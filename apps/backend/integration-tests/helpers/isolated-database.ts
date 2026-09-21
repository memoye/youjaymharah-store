export function requireIsolatedDatabase() {
  if (
    process.env.MEDUSA_TEST_DB_ISOLATED !== "1" ||
    !["localhost", "127.0.0.1"].includes(process.env.DB_HOST ?? "")
  ) {
    throw new Error(
      "Integration tests require MEDUSA_TEST_DB_ISOLATED=1 and an explicitly configured localhost PostgreSQL test instance. Never use the application database.",
    );
  }
}
