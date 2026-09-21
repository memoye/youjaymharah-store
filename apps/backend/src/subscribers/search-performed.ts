import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { recordSearchTermWorkflow } from "../workflows/search-insights";
import { SEARCH_INSIGHTS_MODULE } from "../modules/search-insights";
import type SearchInsightsModuleService from "../modules/search-insights/service";

export const SEARCH_PERFORMED_EVENT = "search.performed";

/**
 * Tallies a submitted search for the trending terms. Suggestion requests do
 * not emit this: counting keystrokes would make every prefix of a word trend.
 */
export default async function searchPerformedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ term: string; result_count: number }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  try {
    const service: SearchInsightsModuleService = container.resolve(
      SEARCH_INSIGHTS_MODULE,
    );
    const term = await service.approveTerm(data.term);
    if (!term) return;
    await recordSearchTermWorkflow(container).run({
      input: { term, result_count: data.result_count },
    });
  } catch {
    logger.warn(
      `${SEARCH_PERFORMED_EVENT}: could not record approved search activity; inspect workflow status.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: SEARCH_PERFORMED_EVENT,
};
