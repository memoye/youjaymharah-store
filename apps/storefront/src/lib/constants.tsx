import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_stripe_stripe: {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Manual Payment",
    icon: <CreditCard />,
  },
  pp_paystack_paystack: {
    title: "Card, bank transfer or USSD (Paystack)",
    icon: <CreditCard />,
  },
  pp_credo_credo: {
    title: "Card or bank transfer (Credo)",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

/**
 * Hosted-checkout gateways: the customer pays on the gateway's own page and
 * comes back to /checkout/callback, where the order is completed.
 */
export const isRedirectPayment = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_paystack_") ||
    providerId?.startsWith("pp_credo_")
  )
}

export const redirectPaymentName = (providerId?: string) => {
  return providerId?.startsWith("pp_credo_") ? "Credo" : "Paystack"
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
