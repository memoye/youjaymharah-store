"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ProductAlert,
  StoreCreateProductAlertBody,
  StoreCreateProductAlertResponse,
} from "@youjaymharah/api-types"

import { useCustomer } from "@/features/customer/hooks"
import { getBrowserSdk } from "@/lib/medusa/browser"
import { queryKeys } from "@/lib/query/keys"

import { productAlertQueries } from "./queries"

const alertsKey = queryKeys.productAlerts.mine()

/** The signed-in customer's alerts. Stays idle (no data) for guests. */
export function useProductAlerts() {
  const { data: customer } = useCustomer()

  return useQuery({
    ...productAlertQueries.mine(),
    enabled: Boolean(customer),
  })
}

/**
 * Whether the signed-in customer is already waiting on this product (or this
 * size of it), so the button can say "We'll email you" instead of "Notify me".
 * Always null for guests.
 */
export function useWaitingProductAlert(
  productId: string,
  variantId?: string | null,
) {
  const { data: customer } = useCustomer()

  const { data: alert = null } = useQuery({
    ...productAlertQueries.mine(),
    enabled: Boolean(customer),
    select: (alerts) =>
      alerts.find(
        (entry) =>
          entry.status === "waiting" &&
          entry.product_id === productId &&
          entry.variant_id === (variantId ?? null),
      ) ?? null,
  })

  return alert
}

export type CreateProductAlertInput = StoreCreateProductAlertBody & {
  product_id: string
}

/**
 * "Notify me". Guests pass `email`; signed-in customers don't (their account
 * email is used). `marketing_opt_in` is the separate "send me offers" box: it
 * starts the newsletter signup, whose confirmation email the shopper must
 * click.
 *
 * Fails with a 400 when the item can be bought right now; refetch the product
 * and show "Add to bag" instead.
 */
export function useCreateProductAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ product_id, ...body }: CreateProductAlertInput) =>
      getBrowserSdk().client.fetch<StoreCreateProductAlertResponse>(
        `/store/products/${encodeURIComponent(product_id)}/alerts`,
        { method: "POST", body },
      ),
    onSuccess: ({ alert }, { marketing_opt_in }) => {
      if (alert) {
        void queryClient.invalidateQueries({ queryKey: alertsKey })
      }

      if (marketing_opt_in) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.marketing.all,
        })
      }
    },
  })
}

/** Cancels one of the customer's alerts, optimistically. */
export function useCancelProductAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertId: string) =>
      getBrowserSdk().client.fetch(
        `/store/customers/me/product-alerts/${encodeURIComponent(alertId)}`,
        { method: "DELETE" },
      ),
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: alertsKey })

      const previous = queryClient.getQueryData<ProductAlert[]>(alertsKey)

      if (previous) {
        queryClient.setQueryData<ProductAlert[]>(
          alertsKey,
          previous.filter((alert) => alert.id !== alertId),
        )
      }

      return { previous }
    },
    onError: (_error, _alertId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(alertsKey, context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: alertsKey }),
  })
}
