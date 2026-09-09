import { defineConfig } from "eslint/config";
import medusa from "@medusajs/eslint-plugin";

export default defineConfig([
  {
    // Build outputs: the backend bundle lands in .medusa/server and the admin
    // bundle is copied to public/ for `medusa start` to serve.
    ignores: [".medusa/**", "public/**", "dist/**"],
  },
  ...medusa.configs.recommended,
]);
