import { randomUUID } from "node:crypto";
import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { SEARCH_INSIGHTS_MODULE } from "../modules/search-insights";
import { validateVocabulary } from "../modules/search-insights/approved-terms";
import { DEFAULT_SEARCH_VOCABULARY } from "../modules/search-insights/default-vocabulary";
import type SearchInsightsModuleService from "../modules/search-insights/service";
import { SEARCH_VOCABULARY_ID } from "../modules/search-insights/service";

export async function seedSearchVocabulary(container: MedusaContainer) {
  const service: SearchInsightsModuleService = container.resolve(
    SEARCH_INSIGHTS_MODULE,
  );
  // Share the admin-save lock so a seed cannot overwrite a concurrent edit.
  return container
    .resolve(Modules.LOCKING)
    .execute("search-vocabulary", async () => {
      const current = await service.readVocabulary();
      if (current.revision !== null) return { created: false };
      const terms = process.env.SEARCH_TRENDING_TERMS?.trim()
        ? current.terms
        : validateVocabulary(DEFAULT_SEARCH_VOCABULARY);
      await service.createSearchVocabularies({
        id: SEARCH_VOCABULARY_ID,
        terms: { items: terms },
        revision: randomUUID(),
      });
      return { created: true };
    });
}

const seedSearchVocabularyStep = createStep(
  "seed-search-vocabulary",
  async (_input: Record<string, never>, { container }) =>
    new StepResponse(await seedSearchVocabulary(container)),
);

export const seedSearchVocabularyWorkflow = createWorkflow(
  "seed-search-vocabulary",
  (input: Record<string, never>) =>
    new WorkflowResponse(seedSearchVocabularyStep(input)),
);
