import type { MedusaContainer } from "@medusajs/framework/types";
import { seedSearchVocabulary } from "../seed-search-vocabulary";
import SearchInsightsModuleService from "../../modules/search-insights/service";
import { DEFAULT_SEARCH_VOCABULARY } from "../../modules/search-insights/default-vocabulary";

const originalTerms = process.env.SEARCH_TRENDING_TERMS;
beforeEach(() => {
  delete process.env.SEARCH_TRENDING_TERMS;
});
afterEach(() => {
  if (originalTerms === undefined) delete process.env.SEARCH_TRENDING_TERMS;
  else process.env.SEARCH_TRENDING_TERMS = originalTerms;
});

function setup(
  initial: { terms: { items: string[] }; revision: string }[] = [],
) {
  let rows = initial;
  const service = Object.create(SearchInsightsModuleService.prototype);
  service.listSearchVocabularies = jest.fn(async () => rows);
  service.createSearchVocabularies = jest.fn(async (data) => {
    rows = [data];
    return data;
  });
  service.createSearchTermStats = jest.fn();
  let pending = Promise.resolve<unknown>(undefined);
  const locking = {
    execute: jest.fn((_key: string, job: () => Promise<unknown>) => {
      const result = pending.then(job);
      pending = result.catch(() => undefined);
      return result;
    }),
  };
  const container = {
    resolve: (key: string) => (key === "locking" ? locking : service),
  } as unknown as MedusaContainer;
  return { container, service, locking };
}

describe("initial trending vocabulary", () => {
  it("seeds valid common terms once without inventing search counts", async () => {
    const { container, service, locking } = setup();
    expect(await seedSearchVocabulary(container)).toEqual({ created: true });
    expect(await seedSearchVocabulary(container)).toEqual({ created: false });
    expect((await service.readVocabulary()).terms).toEqual(
      DEFAULT_SEARCH_VOCABULARY,
    );
    expect(service.createSearchVocabularies).toHaveBeenCalledTimes(1);
    expect(service.createSearchTermStats).not.toHaveBeenCalled();
    expect(locking.execute).toHaveBeenCalledWith(
      "search-vocabulary",
      expect.any(Function),
    );
  });

  it.each([{ terms: [] }, { terms: ["custom phrase"] }])(
    "preserves an existing saved list: $terms",
    async ({ terms }) => {
      const existing = { terms: { items: terms }, revision: "admin-saved" };
      const { container, service } = setup([existing]);
      await seedSearchVocabulary(container);
      expect(service.createSearchVocabularies).not.toHaveBeenCalled();
      expect((await service.readVocabulary()).terms).toEqual(terms);
    },
  );

  it.each(["[]", '[" LINEN ","linen"]'])(
    "honors an explicit environment vocabulary: %s",
    async (value) => {
      process.env.SEARCH_TRENDING_TERMS = value;
      const { container, service } = setup();
      const before = await service.readVocabulary();
      await seedSearchVocabulary(container);
      expect((await service.readVocabulary()).terms).toEqual(before.terms);
    },
  );

  it("serializes simultaneous seed attempts", async () => {
    const { container, service } = setup();
    await Promise.all([
      seedSearchVocabulary(container),
      seedSearchVocabulary(container),
    ]);
    expect(service.createSearchVocabularies).toHaveBeenCalledTimes(1);
  });

  it("does not replace invalid environment configuration with defaults", async () => {
    process.env.SEARCH_TRENDING_TERMS = "invalid";
    const { container, service } = setup();
    await expect(seedSearchVocabulary(container)).rejects.toThrow();
    expect(service.createSearchVocabularies).not.toHaveBeenCalled();
  });
});
