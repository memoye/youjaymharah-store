import { model } from "@medusajs/framework/utils";

/**
 * One row per search term per day, so "trending" is a sum over a window and
 * old activity can be pruned by age. Counting rather than logging each search
 * keeps this table proportional to the vocabulary shoppers use, not to
 * traffic, and it stores no identifiers: a term and a tally, nothing that ties
 * a search to a person.
 */
export const SearchTermStat = model
  .define("search_term_stat", {
    id: model.id({ prefix: "srchterm" }).primaryKey(),
    /** Normalised: lowercased, trimmed, inner whitespace collapsed. */
    term: model.text(),
    /** UTC midnight of the day being counted. */
    day: model.dateTime(),
    searches: model.number().default(0),
    /**
     * What the most recent search for this term returned. Terms that find
     * nothing are recorded but never suggested.
     */
    last_result_count: model.number().default(0),
  })
  .indexes([
    { on: ["term", "day"], unique: true, where: "deleted_at IS NULL" },
    { on: ["day"] },
  ]);
