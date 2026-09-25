import { MedusaService } from "@medusajs/framework/utils";

import { SearchTermStat } from "./models/search-term-stat";
import { SearchVocabulary } from "./models/search-vocabulary";
import {
  approvedSearchTerm,
  approvedTrendingTerms,
  validateFallbackTerms,
  validateVocabulary,
} from "./approved-terms";
export { normaliseTerm } from "./approved-terms";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many day rows one trending read will look at. */
const READ_LIMIT = 5000;
export const SEARCH_VOCABULARY_ID = "search_vocabulary_default";

/**
 * A second reviewed list in the same table: phrases the merchant wants shown
 * when nothing is trending. Its own row, so it carries its own revision and
 * saving one list never invalidates a draft of the other.
 */
export const SEARCH_FALLBACK_TERMS_ID = "search_fallback_terms";

export const TRENDING_DEFAULTS = {
  window_days: 7,
  limit: 6,
  min_searches: 5,
} as const;

/** UTC midnight, the bucket a search is counted in. */
const startOfDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

class SearchInsightsModuleService extends MedusaService({
  SearchTermStat,
  SearchVocabulary,
}) {
  async readVocabulary() {
    const [stored] = await this.listSearchVocabularies({
      id: SEARCH_VOCABULARY_ID,
    });
    return stored
      ? {
          terms: validateVocabulary(stored.terms.items),
          revision: stored.revision,
          source: "admin" as const,
        }
      : {
          terms: approvedTrendingTerms(),
          revision: null,
          source: "environment" as const,
        };
  }

  /**
   * Written by the merchant directly, so unlike shopper searches they need no
   * approval -- only the same validation, which keeps names and contact
   * details out of a list shown to every visitor.
   */
  async readFallbackTerms() {
    const [stored] = await this.listSearchVocabularies({
      id: SEARCH_FALLBACK_TERMS_ID,
    });
    return stored
      ? {
          terms: validateFallbackTerms(stored.terms.items),
          revision: stored.revision,
        }
      : { terms: [] as string[], revision: null };
  }

  async approveTerm(raw: unknown) {
    return approvedSearchTerm(raw, (await this.readVocabulary()).terms);
  }

  /**
   * Adds one search to today's tally for a term. Ignores terms
   * the reviewed vocabulary excludes, including legacy queued input.
   */
  async recordSearch(rawTerm: string, resultCount: number) {
    const term = await this.approveTerm(rawTerm);

    if (!term || !Number.isSafeInteger(resultCount) || resultCount < 0) {
      return;
    }

    const day = startOfDay(new Date());
    const [existing] = await this.listSearchTermStats({ term, day });

    if (existing) {
      await this.updateSearchTermStats([
        {
          id: existing.id,
          searches: existing.searches + 1,
          last_result_count: resultCount,
        },
      ]);

      return;
    }

    try {
      await this.createSearchTermStats([
        { term, day, searches: 1, last_result_count: resultCount },
      ]);
    } catch (error) {
      // Two searches for a new term in the same instant: the unique index
      // rejects the second insert, and the row it lost to is now there to
      // count against.
      const [created] = await this.listSearchTermStats({ term, day });

      if (created) {
        await this.updateSearchTermStats([
          {
            id: created.id,
            searches: created.searches + 1,
            last_result_count: resultCount,
          },
        ]);
      } else {
        throw error;
      }
    }
  }

  /**
   * The most searched terms over the window, busiest first. Terms whose last
   * search found nothing are left out: suggesting them sends shoppers to an
   * empty results page.
   */
  async listTrendingTerms({
    window_days = TRENDING_DEFAULTS.window_days,
    limit = TRENDING_DEFAULTS.limit,
    min_searches = TRENDING_DEFAULTS.min_searches,
  }: {
    window_days?: number;
    limit?: number;
    min_searches?: number;
  } = {}): Promise<string[]> {
    const approved = (await this.readVocabulary()).terms;
    if (!approved.length) return [];
    const since = startOfDay(new Date(Date.now() - (window_days - 1) * DAY_MS));

    const rows = await this.listSearchTermStats(
      { day: { $gte: since }, term: approved },
      {
        select: ["term", "searches", "last_result_count"],
        take: READ_LIMIT,
        order: { day: "DESC" },
      },
    );

    const totals = new Map<string, { searches: number; results: number }>();

    for (const row of rows) {
      if (!approved.includes(row.term)) continue;
      const running = totals.get(row.term) ?? {
        searches: 0,
        results: row.last_result_count,
      };

      totals.set(row.term, {
        searches: running.searches + row.searches,
        results: running.results,
      });
    }

    return [...totals.entries()]
      .filter(
        ([, totalled]) =>
          totalled.results > 0 && totalled.searches >= min_searches,
      )
      .sort(
        ([termA, a], [termB, b]) =>
          b.searches - a.searches || termA.localeCompare(termB),
      )
      .slice(0, limit)
      .map(([term]) => term);
  }

  /** Drops day rows older than the retention window. */
  async pruneOlderThan(days: number) {
    const cutoff = startOfDay(new Date(Date.now() - days * DAY_MS));

    const stale = await this.listSearchTermStats(
      { day: { $lt: cutoff } },
      { select: ["id"], take: READ_LIMIT },
    );

    if (!stale.length) {
      return 0;
    }

    await this.deleteSearchTermStats(stale.map((row) => row.id));

    return stale.length;
  }
}

export default SearchInsightsModuleService;
