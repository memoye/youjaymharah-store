import type { ReactNode } from "react";

import { STORE_NAME } from "./constants";
import { inviteUserEmail } from "./invite-user";
import { orderCanceledEmail } from "./order-canceled";
import { orderPlacedEmail } from "./order-placed";
import { orderShippedEmail } from "./order-shipped";
import { passwordResetEmail } from "./password-reset";

/**
 * Template identifiers. These are the values a subscriber passes as
 * `template` when creating a notification, so they are part of the contract
 * between subscribers and this provider -- renaming one breaks live sends.
 */
export const EmailTemplates = {
  ORDER_PLACED: "order-placed",
  ORDER_SHIPPED: "order-shipped",
  ORDER_CANCELED: "order-canceled",
  PASSWORD_RESET: "password-reset",
  INVITE_USER: "invite-user",
} as const;

export type EmailTemplate =
  (typeof EmailTemplates)[keyof typeof EmailTemplates];

export type ResolvedEmail = {
  subject: string;
  react: ReactNode;
};

type TemplateData = Record<string, unknown>;

type TemplateEntry = (data: TemplateData) => ResolvedEmail;

/** Best-effort order number for subject lines; falls back to an empty string. */
function orderNumber(data: TemplateData): string {
  const order = data.order as { display_id?: number | string } | undefined;

  return order?.display_id ? `#${order.display_id}` : "";
}

const registry: Record<EmailTemplate, TemplateEntry> = {
  [EmailTemplates.ORDER_PLACED]: (data) => ({
    subject:
      `Your ${STORE_NAME} order ${orderNumber(data)} is confirmed`.trim(),
    react: orderPlacedEmail(data as Parameters<typeof orderPlacedEmail>[0]),
  }),
  [EmailTemplates.ORDER_SHIPPED]: (data) => ({
    subject: `Your order ${orderNumber(data)} has shipped`.trim(),
    react: orderShippedEmail(data as Parameters<typeof orderShippedEmail>[0]),
  }),
  [EmailTemplates.ORDER_CANCELED]: (data) => ({
    subject: `Your order ${orderNumber(data)} was canceled`.trim(),
    react: orderCanceledEmail(data as Parameters<typeof orderCanceledEmail>[0]),
  }),
  [EmailTemplates.PASSWORD_RESET]: (data) => ({
    subject: `Reset your ${STORE_NAME} password`,
    react: passwordResetEmail(data as Parameters<typeof passwordResetEmail>[0]),
  }),
  [EmailTemplates.INVITE_USER]: (data) => ({
    subject: `You have been invited to ${STORE_NAME}`,
    react: inviteUserEmail(data as Parameters<typeof inviteUserEmail>[0]),
  }),
};

/**
 * Returns the rendered component and default subject for a template name, or
 * undefined when the name is not one of ours -- the provider then falls back
 * to the inline `content` a caller supplied.
 */
export function resolveEmailTemplate(
  template: string,
  data?: Record<string, unknown> | null,
): ResolvedEmail | undefined {
  const entry = registry[template as EmailTemplate];

  return entry ? entry(data ?? {}) : undefined;
}
