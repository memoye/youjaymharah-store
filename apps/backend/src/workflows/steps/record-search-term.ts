import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { SEARCH_INSIGHTS_MODULE } from "../../modules/search-insights";
import type SearchInsightsModuleService from "../../modules/search-insights/service";

export type RecordSearchTermInput = {
  term: string;
  result_count: number;
};

export const recordSearchTermStep = createStep(
  {
    name: "record-search-term",
    maxRetries: 2,
    retryInterval: 2,
  },
  async (input: RecordSearchTermInput, { container }) => {
    const service: SearchInsightsModuleService = container.resolve(
      SEARCH_INSIGHTS_MODULE,
    );

    await service.recordSearch(input.term, input.result_count);

    return new StepResponse(void 0);
  },
);
