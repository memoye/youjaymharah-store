import { Swatch } from "@lib/util/swatch"
import { clx } from "@modules/common/components/ui"

type ColourSwatchProps = {
  swatch: Swatch | null
  label: string
  size?: "xs" | "md"
  selected?: boolean
  unavailable?: boolean
  className?: string
}

const SIZES = {
  xs: "h-3 w-3",
  md: "h-8 w-8",
}

/**
 * A square of colour (or fabric pattern). Always outlined, so white and
 * cream swatches stay visible on a white page.
 */
const ColourSwatch = ({
  swatch,
  label,
  size = "md",
  selected = false,
  unavailable = false,
  className,
}: ColourSwatchProps) => (
  <span
    aria-hidden="true"
    title={label}
    className={clx(
      "relative inline-block shrink-0 overflow-hidden border border-ui-border-base bg-ui-bg-subtle bg-cover bg-center",
      SIZES[size],
      {
        "ring-1 ring-offset-2 ring-ui-fg-base": selected,
        "opacity-50": unavailable,
      },
      className
    )}
    style={
      swatch?.image
        ? { backgroundImage: `url(${swatch.image})` }
        : swatch?.hex
        ? { backgroundColor: swatch.hex }
        : undefined
    }
  >
    {unavailable && (
      // Diagonal strike: sold out in every size (or the chosen size).
      <span className="absolute left-1/2 top-[-20%] h-[140%] w-px -translate-x-1/2 rotate-45 bg-ui-fg-subtle" />
    )}
  </span>
)

export default ColourSwatch
