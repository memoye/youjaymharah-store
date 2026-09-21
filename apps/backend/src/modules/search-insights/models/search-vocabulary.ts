import { model } from "@medusajs/framework/utils";

export const SearchVocabulary = model.define("search_vocabulary", {
  id: model.id().primaryKey(),
  terms: model.json().default({ items: [] }),
  revision: model.text(),
});
