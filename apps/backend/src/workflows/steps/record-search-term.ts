import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { createHash } from "node:crypto";
import { Modules } from "@medusajs/framework/utils";
import type {
  ILockingModule,
  MedusaContainer,
} from "@medusajs/framework/types";

import { SEARCH_INSIGHTS_MODULE } from "../../modules/search-insights";
import type SearchInsightsModuleService from "../../modules/search-insights/service";
import { normaliseTerm } from "../../modules/search-insights/service";

export type RecordSearchTermInput = {
  term: string;
  result_count: number;
};

export async function recordSearchTerm(
  input: RecordSearchTermInput,
  container: MedusaContainer,
) {
  const term = normaliseTerm(input.term);
  if (!term) return;
  const service: SearchInsightsModuleService = container.resolve(
    SEARCH_INSIGHTS_MODULE,
  );
  const locking: ILockingModule = container.resolve(Modules.LOCKING);
  const key = createHash("sha256").update(term).digest("hex");
  await locking.execute(`search-term:${key}`, () =>
    service.recordSearch(term, input.result_count),
  );
}

export const recordSearchTermStep = createStep(
  {
    name: "record-search-term",
    maxRetries: 2,
    retryInterval: 2,
  },
  async (input: RecordSearchTermInput, { container }) => {
    await recordSearchTerm(input, container);

    return new StepResponse(void 0);
  },
);
