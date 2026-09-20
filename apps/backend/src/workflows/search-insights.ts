import { createWorkflow } from "@medusajs/framework/workflows-sdk";

import {
  recordSearchTermStep,
  type RecordSearchTermInput,
} from "./steps/record-search-term";

/**
 * Counts one search towards the trending terms. Runs from a subscriber, so a
 * shopper never waits on it and a failure cannot break their search.
 */
export const recordSearchTermWorkflow = createWorkflow(
  "record-search-term",
  (input: RecordSearchTermInput) => {
    recordSearchTermStep(input);
  },
);
