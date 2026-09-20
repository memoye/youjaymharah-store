import type { MedusaContainer } from "@medusajs/framework/types";
import SearchInsightsModuleService from "../../modules/search-insights/service";
import { recordSearchTerm } from "../steps/record-search-term";

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
      { term: "linen", searches: 3, last_result_count: 4 },
      { term: "removed", searches: 30, last_result_count: 20 },
    ]);
    expect(await service.listTrendingTerms()).toEqual(["linen"]);
  });
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
