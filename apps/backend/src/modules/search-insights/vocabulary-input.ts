import { z } from "@medusajs/framework/zod";
import { normaliseTerm } from "./approved-terms";

export const UpdateSearchVocabulary = z.object({
  terms: z.array(z.string().max(256).refine((term) => normaliseTerm(term) !== null,
    "Use 2–64 letters, spaces, apostrophes or hyphens per phrase.")).max(100),
  revision: z.string().max(64).nullable(),
}).strict();

export type UpdateSearchVocabularyInput = z.infer<typeof UpdateSearchVocabulary>;
