import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { recordSearchTermWorkflow } from "../workflows/search-insights";
import { approvedSearchTerm } from "../modules/search-insights/approved-terms";

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
  const term = approvedSearchTerm(data.term);
  if (!term) return;

  try {
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
