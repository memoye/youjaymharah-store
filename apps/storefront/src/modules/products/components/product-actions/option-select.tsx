import {
  getProductOptionValues,
  getSwatch,
  isColourOption,
  isOptionValueAvailable,
} from "@lib/util/swatch"
import { HttpTypes } from "@medusajs/types"
import ColourSwatch from "@modules/common/components/colour-swatch"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  product: HttpTypes.StoreProduct
  /** Every option the customer has chosen so far, keyed by option id. */
  selected: Record<string, string | undefined>
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  product,
  selected,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const values = getProductOptionValues(product, option)
  const asSwatches =
    isColourOption(option.title) && values.some((v) => getSwatch(v))

  const available = (value: string) =>
    isOptionValueAvailable(product, option.id, value, selected)

  if (asSwatches) {
    return (
      <div className="flex flex-col gap-y-3">
        <span className="text-sm">
          {title}:{" "}
          <span className="text-ui-fg-subtle">{current ?? "Select"}</span>
        </span>
        <div
          className="flex flex-wrap gap-3"
          role="radiogroup"
          aria-label={title}
          data-testid={dataTestId}
        >
          {values.map((v) => {
            const isAvailable = available(v.value)

            return (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={v.value === current}
                aria-label={isAvailable ? v.value : `${v.value} (sold out)`}
                onClick={() => updateOption(option.id, v.value)}
                disabled={disabled}
                className="rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ui-fg-interactive"
                data-testid="option-swatch"
              >
                <ColourSwatch
                  swatch={getSwatch(v)}
                  label={v.value}
                  selected={v.value === current}
                  unavailable={!isAvailable}
                />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm">Select {title}</span>
      <div
        className="flex flex-wrap justify-between gap-2"
        data-testid={dataTestId}
      >
        {values.map((v) => {
          const isAvailable = available(v.value)

          return (
            <button
              onClick={() => updateOption(option.id, v.value)}
              key={v.value}
              className={clx(
                "border-ui-border-base bg-ui-bg-subtle border text-small-regular h-10 rounded-rounded p-2 flex-1 ",
                {
                  "border-ui-border-interactive": v.value === current,
                  "hover:shadow-elevation-card-rest transition-shadow ease-in-out duration-150":
                    v.value !== current,
                  "text-ui-fg-muted line-through": !isAvailable,
                }
              )}
              aria-label={isAvailable ? v.value : `${v.value} (sold out)`}
              disabled={disabled}
              data-testid="option-button"
            >
              {v.value}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
