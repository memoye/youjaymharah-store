import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { SEARCH_INSIGHTS_MODULE } from "../../../modules/search-insights";
import type SearchInsightsModuleService from "../../../modules/search-insights/service";
import type { UpdateSearchFallbackTermsInput } from "../../../modules/search-insights/vocabulary-input";
import { updateSearchFallbackTermsWorkflow } from "../../../workflows/update-search-fallback-terms";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: SearchInsightsModuleService = req.scope.resolve(
    SEARCH_INSIGHTS_MODULE,
  );
  res.setHeader("Cache-Control", "no-store");
  res.json({ fallback: await service.readFallbackTerms() });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateSearchFallbackTermsInput>,
  res: MedusaResponse,
) => {
  const { result } = await updateSearchFallbackTermsWorkflow(req.scope).run({
    input: req.validatedBody,
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({ fallback: result });
};
