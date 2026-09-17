import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { CART_REMINDER_MODULE } from "../../modules/cart-reminder";
import {
  dueReminder,
  reminderDelaysHours,
  scanWindow,
} from "../../modules/cart-reminder/schedule";
import type CartReminderModuleService from "../../modules/cart-reminder/service";
import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import type NewsletterModuleService from "../../modules/newsletter/service";

export type DueCartReminderItem = {
  title: string;
  variant_title: string | null;
  quantity: number;
  thumbnail: string | null;
  /** Unit price times quantity, as-is (not in minor units). */
  line_total: number | null;
};

export type DueCartReminder = {
  cart_id: string;
  email: string;
  customer_id: string | null;
  currency_code: string;
  /** 0-based: which reminder to send now. */
  stage: number;
  total_reminders: number;
  /** Null until the cart's first reminder creates its row. */
  reminder: { id: string; token: string; failed_attempts: number } | null;
  items: DueCartReminderItem[];
};

export type FindDueCartRemindersOutput = {
  due: DueCartReminder[];
  /** Reminder rows with nothing left to send, to mark finished. */
  finished_ids: string[];
};

const PAGE_SIZE = 200;

type CartRow = {
  id: string;
  email: string | null;
  customer_id: string | null;
  currency_code: string;
  updated_at: string | Date;
  items?:
    | ({
        title: string | null;
        product_title: string | null;
        variant_title: string | null;
        thumbnail: string | null;
        quantity: number | string | null;
        unit_price: number | string | { toString(): string } | null;
      } | null)[]
    | null;
};

function toNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Every abandoned cart with a reminder due now. Read-only: sending and status
 * changes happen in the next step.
 *
 * A cart is skipped when:
 * - reminders are off, or it has no email or no items;
 * - its address used a stop link, or unsubscribed from the newsletter;
 * - an order was placed with that address after the cart's last change, since
 *   the shopper most likely bought elsewhere (another device, say);
 * - it was already stopped, recovered, finished or failed.
 */
export const findDueCartRemindersStep = createStep(
  "find-due-cart-reminders",
  async (_input: void, { container }) => {
    const output: FindDueCartRemindersOutput = { due: [], finished_ids: [] };

    const service: CartReminderModuleService =
      container.resolve(CART_REMINDER_MODULE);
    const settings = await service.retrieveSettings();

    if (!settings.enabled) {
      return new StepResponse(output);
    }

    const delays = reminderDelaysHours(settings);
    const now = new Date();
    const window = scanWindow(delays, now);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const carts: CartRow[] = [];

    for (let skip = 0; ; skip += PAGE_SIZE) {
      const { data } = await query.graph({
        entity: "cart",
        fields: [
          "id",
          "email",
          "customer_id",
          "currency_code",
          "updated_at",
          "items.title",
          "items.product_title",
          "items.variant_title",
          "items.thumbnail",
          "items.quantity",
          "items.unit_price",
        ],
        filters: {
          completed_at: null,
          updated_at: { $gte: window.from, $lte: window.to },
        },
        pagination: { skip, take: PAGE_SIZE, order: { updated_at: "ASC" } },
      });

      carts.push(...(data as CartRow[]));

      if (data.length < PAGE_SIZE) {
        break;
      }
    }

    const candidates = carts.filter(
      (cart) => cart.email?.trim() && (cart.items ?? []).some(Boolean),
    );

    if (!candidates.length) {
      return new StepResponse(output);
    }

    const emailOf = (cart: CartRow) => cart.email!.trim().toLowerCase();
    const emails = [...new Set(candidates.map(emailOf))];

    const newsletter: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    const [reminders, optOuts, unsubscribed, orders] = await Promise.all([
      service.listCartReminders({ cart_id: candidates.map((cart) => cart.id) }),
      service.listCartReminderOptOuts({ email: emails }, { select: ["email"] }),
      newsletter.listNewsletterSubscribers(
        { email: emails, status: "unsubscribed" },
        { select: ["email"] },
      ),
      query.graph({
        entity: "order",
        fields: ["email", "created_at"],
        filters: { email: emails, created_at: { $gte: window.from } },
      }),
    ]);

    const byCart = new Map(reminders.map((row) => [row.cart_id, row]));
    const blocked = new Set([
      ...optOuts.map((row) => row.email.toLowerCase()),
      ...unsubscribed.map((row) => row.email.toLowerCase()),
    ]);
    const lastOrderAt = new Map<string, number>();

    for (const order of orders.data as {
      email: string | null;
      created_at: string | Date;
    }[]) {
      if (!order.email) {
        continue;
      }

      const email = order.email.toLowerCase();
      const at = new Date(order.created_at).getTime();
      lastOrderAt.set(email, Math.max(lastOrderAt.get(email) ?? 0, at));
    }

    for (const cart of candidates) {
      const email = emailOf(cart);
      const row = byCart.get(cart.id);

      if (blocked.has(email) || (row && row.status !== "active")) {
        continue;
      }

      const lastActivity = new Date(cart.updated_at);

      if ((lastOrderAt.get(email) ?? 0) > lastActivity.getTime()) {
        continue;
      }

      const result = dueReminder(
        lastActivity,
        row?.reminders_sent ?? 0,
        delays,
        now,
      );

      if (!result) {
        continue;
      }

      if ("finished" in result) {
        if (row) {
          output.finished_ids.push(row.id);
        }

        continue;
      }

      output.due.push({
        cart_id: cart.id,
        email,
        customer_id: cart.customer_id,
        currency_code: cart.currency_code,
        stage: result.stage,
        total_reminders: delays.length,
        reminder: row
          ? {
              id: row.id,
              token: row.token,
              failed_attempts: row.failed_attempts,
            }
          : null,
        items: (cart.items ?? [])
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => {
            const quantity = toNumber(item.quantity) ?? 1;
            const unitPrice = toNumber(item.unit_price?.toString());

            return {
              title: item.product_title || item.title || "Item",
              variant_title: item.variant_title,
              quantity,
              thumbnail: item.thumbnail,
              line_total: unitPrice === null ? null : unitPrice * quantity,
            };
          }),
      });
    }

    return new StepResponse(output);
  },
);
