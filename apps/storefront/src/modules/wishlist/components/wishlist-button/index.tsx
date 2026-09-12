"use client"

import { addToWishlist, removeFromWishlist } from "@lib/data/wishlist"
import { clx } from "@modules/common/components/ui"
import Heart from "@modules/common/icons/heart"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

type WishlistButtonProps = {
  productId: string
  productTitle: string
  /** The colour/size picked on the product page, saved with the product. */
  variantId?: string | null
  /** The wishlist item for this product, when it is already saved. */
  savedItemId?: string | null
  /** Guests are sent to sign in; wishlists belong to customer accounts. */
  isLoggedIn: boolean
  /** "icon" on product cards, "button" beside Add to cart. */
  appearance?: "icon" | "button"
  className?: string
}

const WishlistButton = ({
  productId,
  productTitle,
  variantId,
  savedItemId,
  isLoggedIn,
  appearance = "icon",
  className,
}: WishlistButtonProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [itemId, setItemId] = useState(savedItemId ?? null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Re-sync when the server re-renders with the fresh wishlist.
  useEffect(() => {
    setItemId(savedItemId ?? null)
  }, [savedItemId])

  const saved = !!itemId

  const toggle = () => {
    if (!isLoggedIn) {
      router.push(`/${countryCode}/account`)
      return
    }

    setError(null)
    const previous = itemId
    // Optimistic: flip the heart now, settle once the server answers.
    setItemId(previous ? null : "pending")

    startTransition(async () => {
      try {
        if (previous) {
          await removeFromWishlist(previous)
          setItemId(null)
        } else {
          const wishlist = await addToWishlist({ productId, variantId })
          setItemId(
            wishlist.items.find((i) => i.product_id === productId)?.id ?? null
          )
        }
      } catch (e) {
        setItemId(previous)
        setError(
          e instanceof Error ? e.message : "Couldn't update your wishlist."
        )
      }
    })
  }

  const label = !isLoggedIn
    ? `Sign in to save ${productTitle}`
    : saved
    ? `Remove ${productTitle} from wishlist`
    : `Save ${productTitle} to wishlist`

  if (appearance === "button") {
    return (
      <div className={clx("flex flex-col gap-y-1", className)}>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={saved}
          aria-label={label}
          className="flex h-10 w-full items-center justify-center gap-x-2 border border-ui-border-base text-small-regular transition-colors hover:border-ui-border-interactive disabled:opacity-60"
          data-testid="wishlist-button"
        >
          <Heart filled={saved} size={16} />
          <span>{saved ? "Saved" : "Save to wishlist"}</span>
        </button>
        {error && (
          <span role="alert" className="text-small-regular text-rose-600">
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={error ? `${label}. ${error}` : label}
      title={error ?? label}
      className={clx(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ui-fg-base shadow-sm transition-opacity hover:bg-white disabled:opacity-60",
        className
      )}
      data-testid="wishlist-icon-button"
    >
      <Heart filled={saved} size={18} />
    </button>
  )
}

export default WishlistButton
