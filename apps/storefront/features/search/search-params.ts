import { createLoader, createSerializer, parseAsString } from "nuqs/server"

/**
 * The parts of a search that live in the URL, defined once so a server
 * component reading them and a client component writing them agree on names,
 * types and defaults. Imported from `nuqs/server`, which carries no "use
 * client" and is safe on both sides.
 *
 * Add sort, facets and paging here as the results page grows.
 */
export const searchParams = {
  /** Empty by default, and an empty value is dropped from the URL. */
  q: parseAsString.withDefault(""),
}

/** For server components: `const { q } = await loadSearchParams(props.searchParams)`. */
export const loadSearchParams = createLoader(searchParams)

/** Builds a link from the same definition: `searchUrl("/search", { q })`. */
export const searchUrl = createSerializer(searchParams)
