import type { MedusaContainer } from "@medusajs/framework/types";
import SearchInsightsModuleService from "../../modules/search-insights/service";
import { recordSearchTerm } from "../steps/record-search-term";
import {
  approvedTrendingTerms,
  approvedSearchTerm,
} from "../../modules/search-insights/approved-terms";
import { visibleTrendingTerms } from "../get-trending-search-terms";
import { GET as searchProducts } from "../../api/store/search/route";

const originalTerms = process.env.SEARCH_TRENDING_TERMS;
beforeEach(() => {
  process.env.SEARCH_TRENDING_TERMS = '["linen","removed","dresses"]';
});
afterEach(() => {
  if (originalTerms === undefined) delete process.env.SEARCH_TRENDING_TERMS;
  else process.env.SEARCH_TRENDING_TERMS = originalTerms;
});

describe("search insights", () => {
  it("serializes concurrent increments for the same normalized term", async () => {
    let searches = 10;
    const service = Object.create(SearchInsightsModuleService.prototype);
    service.listSearchTermStats = jest.fn(async () => [
      { id: "stat", searches },
    ]);
    service.updateSearchTermStats = jest.fn(async ([patch]) => {
      searches = patch.searches;
    });
    const queues = new Map<string, Promise<unknown>>();
    const locking = {
      execute: (key: string, job: () => Promise<unknown>) => {
        const result = (queues.get(key) ?? Promise.resolve()).then(job);
        queues.set(key, result);
        return result;
      },
    };
    const container = {
      resolve: (key: string) => (key === "locking" ? locking : service),
    } as unknown as MedusaContainer;
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        recordSearchTerm(
          { term: i % 2 ? "LINEN" : " linen ", result_count: 3 },
          container,
        ),
      ),
    );
    expect(searches).toBe(30);
  });
  it("uses the newest result count, not the historical maximum", async () => {
    const service = Object.create(SearchInsightsModuleService.prototype);
    service.listSearchTermStats = jest.fn().mockResolvedValue([
      { term: "removed", searches: 3, last_result_count: 0 },
      { term: "linen", searches: 5, last_result_count: 4 },
      { term: "removed", searches: 30, last_result_count: 20 },
    ]);
    expect(await service.listTrendingTerms()).toEqual(["linen"]);
  });

  it("disables collection and reads when there is no reviewed vocabulary", async () => {
    delete process.env.SEARCH_TRENDING_TERMS;
    const service = Object.create(SearchInsightsModuleService.prototype);
    service.listSearchTermStats = jest.fn();
    expect(await service.listTrendingTerms()).toEqual([]);
    await service.recordSearch("linen", 3);
    expect(service.listSearchTermStats).not.toHaveBeenCalled();
  });

  it.each([
    "Ada Lovelace",
    "ada@example.com",
    "call me 08012345678",
    "https://example.com",
    "private note",
    "linen for Ada",
  ])("does not collect unapproved or sensitive text: %s", async (term) => {
    const service = Object.create(SearchInsightsModuleService.prototype);
    service.listSearchTermStats = jest.fn();
    await service.recordSearch(term, 100);
    expect(service.listSearchTermStats).not.toHaveBeenCalled();
    expect(approvedSearchTerm(term)).toBeNull();
  });

  it("normalizes approved phrases exactly, never by substring or fuzzy matching", () => {
    expect(approvedSearchTerm("  LINEN  ")).toBe("linen");
    expect(approvedSearchTerm("ｌｉｎｅｎ")).toBe("linen");
    expect(approvedSearchTerm("linen for Ada")).toBeNull();
    expect(approvedSearchTerm("linenn")).toBeNull();
  });

  it.each(['{"linen":true}', '["ada@example.com"]', "[42]", "not-json"])(
    "rejects malformed configuration without echoing its value",
    (value) => {
      expect(() => approvedTrendingTerms(value)).toThrow(
        "SEARCH_TRENDING_TERMS must be",
      );
      try {
        approvedTrendingTerms(value);
      } catch (error) {
        expect((error as Error).message).not.toContain(value);
      }
    },
  );

  it("does not publish legacy unapproved rows or low-volume phrases", async () => {
    const service = Object.create(SearchInsightsModuleService.prototype);
    service.listSearchTermStats = jest.fn().mockResolvedValue([
      { term: "Ada Lovelace", searches: 500, last_result_count: 10 },
      { term: "dresses", searches: 4, last_result_count: 10 },
      { term: "linen", searches: 5, last_result_count: 10 },
    ]);
    expect(await service.listTrendingTerms()).toEqual(["linen"]);
    expect(service.listSearchTermStats).toHaveBeenCalledWith(
      expect.objectContaining({ term: ["linen", "removed", "dresses"] }),
      expect.anything(),
    );
  });

  it("checks current published availability against the requesting sales channels", async () => {
    const search = {
      search: jest.fn(async ({ filters }) => ({
        hits: filters.q === "linen" ? [{ document: { id: "product_1" } }] : [],
      })),
    };
    const service = {
      listTrendingTerms: jest.fn().mockResolvedValue(["linen", "removed"]),
    };
    const container = {
      resolve: (key: string) => (key === "search" ? search : service),
    } as unknown as MedusaContainer;
    expect(
      await visibleTrendingTerms(
        { limit: 6, sales_channel_ids: ["channel_1"] },
        container,
      ),
    ).toEqual(["linen"]);
    expect(search.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          status: "published",
          sales_channel_ids: { $in: ["channel_1"] },
        }),
      }),
    );
    search.search.mockClear();
    expect(
      await visibleTrendingTerms(
        { limit: 6, sales_channel_ids: [] },
        container,
      ),
    ).toEqual([]);
    expect(search.search).not.toHaveBeenCalled();
  });

  it.each([
    ["ada@example.com", null],
    ["Ada Lovelace", null],
    [" LINEN ", "linen"],
  ])(
    "filters %s before the event bus while leaving product search intact",
    async (q, expected) => {
      const emit = jest.fn();
      const search = {
        listRetrievableFields: () => ["id"],
        search: jest
          .fn()
          .mockResolvedValue({
            hits: [],
            metadata: { count: 3, take: 20, skip: 0 },
          }),
      };
      const req = {
        validatedQuery: { q, limit: 20, offset: 0 },
        publishable_key_context: { sales_channel_ids: ["channel_1"] },
        scope: {
          resolve: (key: string) => (key === "search" ? search : { emit }),
        },
      };
      const res = { json: jest.fn() };
      await searchProducts(req as never, res as never);
      expect(search.search).toHaveBeenCalledWith(
        expect.objectContaining({ filters: expect.objectContaining({ q }) }),
      );
      if (expected)
        expect(emit).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { term: expected, result_count: 3 },
          }),
        );
      else expect(emit).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    },
  );
  it("does not silently swallow a persistence failure", async () => {
    const service = Object.create(SearchInsightsModuleService.prototype);
    service.listSearchTermStats = jest.fn().mockResolvedValue([]);
    service.createSearchTermStats = jest
      .fn()
      .mockRejectedValue(new Error("database unavailable"));
    await expect(service.recordSearch("linen", 3)).rejects.toThrow(
      "database unavailable",
    );
  });
});
