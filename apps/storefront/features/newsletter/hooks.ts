"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import type { StoreNewsletterAckResponse } from "@youjaymharah/api-types"

import { getBrowserSdk } from "@/lib/medusa/browser"

import { newsletterQueries } from "./queries"

export function useNewsletterSettings() {
  return useQuery(newsletterQueries.settings())
}

/**
 * `source` is stored on the subscriber, so the admin can see which form a
 * signup came from.
 */
export function useSubscribeToNewsletter(source: string) {
  return useMutation({
    mutationFn: (email: string) =>
      getBrowserSdk().client.fetch<StoreNewsletterAckResponse>(
        "/store/newsletter/subscribe",
        { method: "POST", body: { email, source } },
      ),
  })
}

export function useConfirmNewsletter() {
  return useMutation({
    mutationFn: (token: string) =>
      getBrowserSdk().client.fetch<StoreNewsletterAckResponse>(
        "/store/newsletter/confirm",
        { method: "POST", body: { token } },
      ),
  })
}

export function useUnsubscribeFromNewsletter() {
  return useMutation({
    mutationFn: (token: string) =>
      getBrowserSdk().client.fetch<StoreNewsletterAckResponse>(
        "/store/newsletter/unsubscribe",
        { method: "POST", body: { token } },
      ),
  })
}
