import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { SEARCH_INSIGHTS_MODULE } from "../modules/search-insights";
import type SearchInsightsModuleService from "../modules/search-insights/service";

/** Long enough to see a season's trends, short enough to stay small. */
const RETENTION_DAYS = 90;

export default async function pruneSearchTerms(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const service: SearchInsightsModuleService = container.resolve(
    SEARCH_INSIGHTS_MODULE,
  );

  const deleted = await service.pruneOlderThan(RETENTION_DAYS);

  if (deleted) {
    logger.info(
      `Pruned ${deleted} search term rows older than ${RETENTION_DAYS} days.`,
    );
  }
}

export const config = {
  name: "prune-search-terms",
  schedule: "15 4 * * 0", // Sundays at 04:15
};
