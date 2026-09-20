import { randomBytes } from "node:crypto";

import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { CART_REMINDER_MODULE } from "../../modules/cart-reminder";
import type CartReminderModuleService from "../../modules/cart-reminder/service";
import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { emailIdempotency } from "../../modules/resend/idempotency";
import { STOREFRONT_URL } from "../../modules/resend/emails/constants";
import { formatMoney } from "../../modules/resend/utils/format-money";
import type { FindDueCartRemindersOutput } from "./find-due-cart-reminders";

/** Failed sends before a cart is given up on, as for product alerts. */
const MAX_FAILED_ATTEMPTS = 5;

/** Storefront pages the email links to. */
export function cartReminderLinks(token: string) {
  const encoded = encodeURIComponent(token);

  return {
    cart_url: `${STOREFRONT_URL}/shopping-bag/restore?token=${encoded}`,
    stop_url: `${STOREFRONT_URL}/shopping-bag/reminders/stop?token=${encoded}`,
  };
}

/**
 * Sends each due reminder and records it, and marks finished carts.
 *
 * The delivery key is stable across retries of the same reminder stage.
 *
 * One failure never stops the run; after MAX_FAILED_ATTEMPTS the cart is
 * given up on.
 */
export const sendCartReminderEmailsStep = createStep(
  "send-cart-reminder-emails",
  async (input: FindDueCartRemindersOutput, { container }) => {
    const service: CartReminderModuleService =
      container.resolve(CART_REMINDER_MODULE);

    if (input.finished_ids.length) {
      await service.updateCartReminders(
        input.finished_ids.map((id) => ({ id, status: "finished" as const })),
      );
    }

    if (!input.due.length) {
      return new StepResponse({
        sent: 0,
        failed: 0,
        given_up: 0,
        finished: input.finished_ids.length,
      });
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const notifications: INotificationModuleService = container.resolve(
      Modules.NOTIFICATION,
    );
    const branding: BrandingModuleService = container.resolve(BRANDING_MODULE);
    const brand = await branding.retrieveSettings();

    let sent = 0;
    let failed = 0;
    let givenUp = 0;

    for (const dueCart of input.due) {
      let reminder = dueCart.reminder;

      if (!reminder) {
        const [created] = await service.createCartReminders([
          {
            cart_id: dueCart.cart_id,
            email: dueCart.email,
            customer_id: dueCart.customer_id,
            token: randomBytes(24).toString("hex"),
          },
        ]);

        reminder = { id: created.id, token: created.token, failed_attempts: 0 };
      }

      const reminderNumber = dueCart.stage + 1;

      try {
        await notifications.createNotifications({
          to: dueCart.email,
          channel: "email",
          template: EmailTemplates.CART_REMINDER,
          data: {
            brand,
            reminder_number: reminderNumber,
            total_reminders: dueCart.total_reminders,
            items: dueCart.items.map((item) => ({
              title: item.title,
              variant_title: item.variant_title,
              quantity: item.quantity,
              thumbnail: item.thumbnail,
              price:
                item.line_total === null
                  ? null
                  : formatMoney(item.line_total, dueCart.currency_code) || null,
            })),
            ...cartReminderLinks(reminder.token),
          },
          ...emailIdempotency(
            `cart-reminder:${reminder.id}:${dueCart.stage}`,
            reminder.failed_attempts,
          ),
        });
      } catch (error) {
        failed += 1;

        const attempts = reminder.failed_attempts + 1;
        const giveUp = attempts >= MAX_FAILED_ATTEMPTS;

        if (giveUp) {
          givenUp += 1;
        }

        await service.updateCartReminders({
          id: reminder.id,
          failed_attempts: attempts,
          ...(giveUp ? { status: "failed" as const } : {}),
        });

        logger.warn(
          `cart-reminders: could not email cart ${dueCart.cart_id} (attempt ${attempts} of ${MAX_FAILED_ATTEMPTS})${
            giveUp ? "; giving up" : "; retrying on the next run"
          }: ${(error as Error).message}`,
        );

        continue;
      }

      await service.updateCartReminders({
        id: reminder.id,
        reminders_sent: reminderNumber,
        last_sent_at: new Date(),
        failed_attempts: 0,
        status:
          reminderNumber >= dueCart.total_reminders
            ? ("finished" as const)
            : ("active" as const),
      });

      sent += 1;
    }

    return new StepResponse({
      sent,
      failed,
      given_up: givenUp,
      finished: input.finished_ids.length,
    });
  },
);
