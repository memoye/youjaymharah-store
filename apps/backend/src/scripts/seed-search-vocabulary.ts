import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { seedSearchVocabularyWorkflow } from "../workflows/seed-search-vocabulary";

export default async function seedSearchVocabularyScript({ container }: ExecArgs) {
  const { result } = await seedSearchVocabularyWorkflow(container).run({ input: {} });
  container.resolve(ContainerRegistrationKeys.LOGGER).info(
    result.created
      ? "Trending vocabulary initialized. Review it in Settings > Trending searches."
      : "Trending vocabulary already saved; keeping the existing list unchanged.",
  );
}
