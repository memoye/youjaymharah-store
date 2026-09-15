"use client"

import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type {
  StoreAddWishlistItemBody,
  StoreWishlistResponse,
  Wishlist,
} from "@youjaymharah/api-types"

import { getBrowserSdk } from "@/lib/medusa/browser"
import { CURRENT_WISHLIST_ID } from "@/lib/medusa/constants"
import { queryKeys } from "@/lib/query/keys"

import { wishlistQueries } from "./queries"

type WishlistItem = Wishlist["items"][number]

/** Every wishlist write shares this key, so they can tell whether others are in flight. */
const WISHLIST_MUTATION_KEY = ["wishlist"] as const

const wishlistKey = queryKeys.wishlist.current()

/** Marks an item shown before Medusa has given it a real id. */
const OPTIMISTIC_ID_PREFIX = "optimistic_"

const itemsPath = `/store/wishlists/${CURRENT_WISHLIST_ID}/items`

/**
 * Writes a server response into the cache once no other wishlist change is
 * running; see settleCart in features/cart/hooks.ts. When the last change
 * failed there is no response to write, so the list is fetched instead of
 * trusting a rollback that may have undone another change's optimistic state.
 */
function settleWishlist(
  queryClient: QueryClient,
  wishlist: Wishlist | undefined,
): void {
  if (queryClient.isMutating({ mutationKey: WISHLIST_MUTATION_KEY }) !== 1) {
    return
  }

  if (wishlist) {
    queryClient.setQueryData(wishlistKey, wishlist)
  } else {
    void queryClient.invalidateQueries({ queryKey: wishlistKey })
  }
}

export function useWishlist() {
  return useQuery(wishlistQueries.current())
}

/**
 * One product's state, for a heart button. `isPending` is true while a save
 * or removal of this product is in flight: disable the button meanwhile, since
 * a just-saved item has no real id to remove yet.
 */
export function useWishlistItem(productId: string) {
  const { data: item = null } = useQuery({
    ...wishlistQueries.current(),
    select: (wishlist) =>
      wishlist.items.find((entry) => entry.product_id === productId) ?? null,
  })

  const pending = useMutationState({
    filters: {
      mutationKey: WISHLIST_MUTATION_KEY,
      status: "pending",
      predicate: (mutation) =>
        (mutation.state.variables as { product_id?: string } | undefined)
          ?.product_id === productId,
    },
    select: (mutation) => mutation.mutationId,
  })

  return { item, isSaved: item !== null, isPending: pending.length > 0 }
}

/**
 * Saves a product, optimistically. Works the same for guests and customers:
 * a guest's first save creates their list. Posting a product that is already
 * saved with a `variant_id` updates it to that colour and size.
 */
export function useSaveToWishlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: WISHLIST_MUTATION_KEY,
    mutationFn: async (input: StoreAddWishlistItemBody): Promise<Wishlist> =>
      (
        await getBrowserSdk().client.fetch<StoreWishlistResponse>(itemsPath, {
          method: "POST",
          body: input,
        })
      ).wishlist,
    onMutate: async ({ product_id, variant_id }) => {
      await queryClient.cancelQueries({ queryKey: wishlistKey })

      const previous = queryClient.getQueryData<Wishlist>(wishlistKey)

      // Nothing loaded yet: an optimistic list would hide the saved items the
      // server has, so wait for the response instead.
      if (!previous) {
        return { previous }
      }

      const existing = previous.items.find(
        (item) => item.product_id === product_id,
      )

      const items: WishlistItem[] = existing
        ? previous.items.map((item) =>
            item === existing && variant_id
              ? { ...item, product_variant_id: variant_id }
              : item,
          )
        : [
            {
              id: `${OPTIMISTIC_ID_PREFIX}${product_id}`,
              product_id,
              product_variant_id: variant_id ?? null,
              created_at: new Date().toISOString(),
            },
            ...previous.items,
          ]

      queryClient.setQueryData<Wishlist>(wishlistKey, { ...previous, items })

      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(wishlistKey, context.previous)
      }
    },
    onSettled: (wishlist) => settleWishlist(queryClient, wishlist),
  })
}

/** Removes an item optimistically and rolls back if Medusa refuses. */
export function useRemoveFromWishlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: WISHLIST_MUTATION_KEY,
    mutationFn: async (item: WishlistItem): Promise<Wishlist> => {
      if (item.id.startsWith(OPTIMISTIC_ID_PREFIX)) {
        throw new TypeError(
          "This item is still being saved. Wait for useWishlistItem's isPending to clear.",
        )
      }

      return (
        await getBrowserSdk().client.fetch<StoreWishlistResponse>(
          `${itemsPath}/${encodeURIComponent(item.id)}`,
          { method: "DELETE" },
        )
      ).wishlist
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: wishlistKey })

      const previous = queryClient.getQueryData<Wishlist>(wishlistKey)

      if (previous) {
        queryClient.setQueryData<Wishlist>(wishlistKey, {
          ...previous,
          items: previous.items.filter((entry) => entry.id !== item.id),
        })
      }

      return { previous }
    },
    onError: (_error, _item, context) => {
      if (context?.previous) {
        queryClient.setQueryData(wishlistKey, context.previous)
      }
    },
    onSettled: (wishlist) => settleWishlist(queryClient, wishlist),
  })
}
