import { z } from "@medusajs/framework/zod";
import { MAX_FALLBACK_TERMS, normaliseTerm } from "./approved-terms";

export const UpdateSearchVocabulary = z
  .object({
    terms: z
      .array(
        z
          .string()
          .max(256)
          .refine(
            (term) => normaliseTerm(term) !== null,
            "Use 2–64 letters, spaces, apostrophes or hyphens per phrase.",
          ),
      )
      .max(100),
    revision: z.string().max(64).nullable(),
  })
  .strict();

export type UpdateSearchVocabularyInput = z.infer<
  typeof UpdateSearchVocabulary
>;

export const UpdateSearchFallbackTerms = z
  .object({
    terms: z
      .array(
        z
          .string()
          .max(256)
          .refine(
            (term) => normaliseTerm(term) !== null,
            "Use 2–64 letters, spaces, apostrophes or hyphens per phrase.",
          ),
      )
      .max(MAX_FALLBACK_TERMS),
    revision: z.string().max(64).nullable(),
  })
  .strict();

export type UpdateSearchFallbackTermsInput = z.infer<
  typeof UpdateSearchFallbackTerms
>;
