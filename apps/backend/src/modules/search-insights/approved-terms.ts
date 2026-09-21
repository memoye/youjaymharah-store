import { MedusaError } from "@medusajs/framework/utils";

const invalidConfiguration = () =>
  new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "SEARCH_TRENDING_TERMS must be a JSON array of at most 100 reviewed phrases (2–64 letters, spaces, apostrophes or hyphens each).",
  );

export const normaliseTerm = (raw: unknown): string | null => {
  if (typeof raw !== "string" || raw.length > 256) return null;
  const term = raw.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  if (
    term.length < 2 ||
    term.length > 64 ||
    !/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(term)
  )
    return null;
  return term;
};

export function approvedTrendingTerms(
  value = process.env.SEARCH_TRENDING_TERMS,
): string[] {
  if (!value?.trim()) return [];
  try {
    if (value.length > 10_000) throw invalidConfiguration();
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 100)
      throw invalidConfiguration();
    const terms = parsed.map(normaliseTerm);
    if (terms.some((term) => term === null)) throw invalidConfiguration();
    return [...new Set(terms as string[])];
  } catch {
    throw invalidConfiguration();
  }
}

export function validateVocabulary(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Use at most 100 reviewed phrases.");
  }
  const terms = value.map(normaliseTerm);
  if (terms.some((term) => term === null)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Each phrase must contain 2–64 letters, spaces, apostrophes or hyphens. Do not include personal information.");
  }
  return [...new Set(terms as string[])];
}

export function approvedSearchTerm(raw: unknown, approved = approvedTrendingTerms()): string | null {
  const term = normaliseTerm(raw);
  return term && approved.includes(term) ? term : null;
}
