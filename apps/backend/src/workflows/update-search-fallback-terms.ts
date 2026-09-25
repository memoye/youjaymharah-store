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
  SEARCH_FALLBACK_TERMS_ID,
} from "../modules/search-insights/service";
import { validateFallbackTerms } from "../modules/search-insights/approved-terms";
import type { UpdateSearchFallbackTermsInput } from "../modules/search-insights/vocabulary-input";

const updateSearchFallbackTermsStep = createStep(
  "update-search-fallback-terms",
  async (input: UpdateSearchFallbackTermsInput, { container }) => {
    const terms = validateFallbackTerms(input.terms);
    const service: SearchInsightsModuleService = container.resolve(
      SEARCH_INSIGHTS_MODULE,
    );
    const result = await container
      .resolve(Modules.LOCKING)
      .execute("search-fallback-terms", async () => {
        const current = await service.readFallbackTerms();
        if (current.revision !== input.revision) {
          throw new MedusaError(
            MedusaError.Types.CONFLICT,
            "The suggested phrases changed while you were editing. Reload and review the latest list before saving.",
          );
        }
        const revision = randomUUID();
        const data = {
          id: SEARCH_FALLBACK_TERMS_ID,
          terms: { items: terms },
          revision,
        };
        if (current.revision === null)
          await service.createSearchVocabularies(data);
        else await service.updateSearchVocabularies(data);
        return { terms, revision };
      });
    return new StepResponse(result);
  },
);

export const updateSearchFallbackTermsWorkflow = createWorkflow(
  "update-search-fallback-terms",
  (input: UpdateSearchFallbackTermsInput) => {
    return new WorkflowResponse(updateSearchFallbackTermsStep(input));
  },
);
