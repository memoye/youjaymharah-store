"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoreMarketingPreferenceResponse } from "@youjaymharah/api-types";

import { useCustomer } from "@/features/customer/hooks";
import { getBrowserSdk } from "@/lib/medusa/browser";
import { queryKeys } from "@/lib/query/keys";

import { marketingQueries } from "./queries";

/** The account's marketing email status. Stays idle for guests. */
export function useMarketingPreference() {
  const { data: customer } = useCustomer();

  return useQuery({
    ...marketingQueries.preference(),
    enabled: Boolean(customer),
  });
}

/**
 * The account setting's switch. Not optimistic: turning it on usually lands
 * on "pending" until the customer clicks the confirmation email, so show the
 * status the server returns ("Check your inbox to confirm").
 */
export function useSetMarketingPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscribed: boolean) =>
      (
        await getBrowserSdk().client.fetch<StoreMarketingPreferenceResponse>(
          "/store/customers/me/marketing",
          { method: "POST", body: { subscribed } },
        )
      ).marketing,
    onSuccess: (marketing) =>
      queryClient.setQueryData(queryKeys.marketing.preference(), marketing),
  });
}
