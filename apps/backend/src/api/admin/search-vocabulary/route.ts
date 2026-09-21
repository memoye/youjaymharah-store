import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SEARCH_INSIGHTS_MODULE } from "../../../modules/search-insights";
import type SearchInsightsModuleService from "../../../modules/search-insights/service";
import type { UpdateSearchVocabularyInput } from "../../../modules/search-insights/vocabulary-input";
import { updateSearchVocabularyWorkflow } from "../../../workflows/update-search-vocabulary";

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const service: SearchInsightsModuleService = req.scope.resolve(SEARCH_INSIGHTS_MODULE);
  res.setHeader("Cache-Control", "no-store");
  res.json({ vocabulary: await service.readVocabulary() });
};

export const POST = async (req: AuthenticatedMedusaRequest<UpdateSearchVocabularyInput>, res: MedusaResponse) => {
  const { result } = await updateSearchVocabularyWorkflow(req.scope).run({ input: req.validatedBody });
  res.setHeader("Cache-Control", "no-store");
  res.json({ vocabulary: result });
};
