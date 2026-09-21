import { randomUUID } from "node:crypto";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { SEARCH_INSIGHTS_MODULE } from "../modules/search-insights";
import SearchInsightsModuleService, {
  SEARCH_VOCABULARY_ID,
} from "../modules/search-insights/service";
import { validateVocabulary } from "../modules/search-insights/approved-terms";
import type { UpdateSearchVocabularyInput } from "../modules/search-insights/vocabulary-input";

const updateSearchVocabularyStep = createStep(
  "update-search-vocabulary",
  async (input: UpdateSearchVocabularyInput, { container }) => {
    const terms = validateVocabulary(input.terms);
    const service: SearchInsightsModuleService = container.resolve(
      SEARCH_INSIGHTS_MODULE,
    );
    const result = await container
      .resolve(Modules.LOCKING)
      .execute("search-vocabulary", async () => {
        const current = await service.readVocabulary();
        if (current.revision !== input.revision) {
          throw new MedusaError(
            MedusaError.Types.CONFLICT,
            "The vocabulary changed while you were editing. Reload and review the latest list before saving.",
          );
        }
        const revision = randomUUID();
        const data = {
          id: SEARCH_VOCABULARY_ID,
          terms: { items: terms },
          revision,
        };
        if (current.revision === null)
          await service.createSearchVocabularies(data);
        else await service.updateSearchVocabularies(data);
        return { terms, revision, source: "admin" as const };
      });
    return new StepResponse(result);
  },
);

export const updateSearchVocabularyWorkflow = createWorkflow(
  "update-search-vocabulary",
  (input: UpdateSearchVocabularyInput) => {
    return new WorkflowResponse(updateSearchVocabularyStep(input));
  },
);
