import { randomBytes } from "node:crypto";

import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BAG_REMINDER_MODULE } from "../../modules/bag-reminder";
import type BagReminderModuleService from "../../modules/bag-reminder/service";
import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { STOREFRONT_URL } from "../../modules/resend/emails/constants";
import { formatMoney } from "../../modules/resend/utils/format-money";
import type { FindDueBagRemindersOutput } from "./find-due-bag-reminders";

/** Failed sends before a bag is given up on, as for product alerts. */
const MAX_FAILED_ATTEMPTS = 5;

/** Storefront pages the email links to. */
export function bagReminderLinks(token: string) {
  const encoded = encodeURIComponent(token);

  return {
    bag_url: `${STOREFRONT_URL}/shopping-bag/restore?token=${encoded}`,
    stop_url: `${STOREFRONT_URL}/shopping-bag/reminders/stop?token=${encoded}`,
  };
}

/**
 * Sends each due reminder and records it, and marks finished bags.
 *
 * The idempotency key is the bag, the reminder number and the attempt: a
 * reminder sent but not yet recorded (a crash between the two) is not sent
 * twice, while a failed send retries under a new key, because the
 * notification module keeps the failed record under the old one.
 *
 * One failure never stops the run; after MAX_FAILED_ATTEMPTS the bag is
 * given up on.
 */
export const sendBagReminderEmailsStep = createStep(
  "send-bag-reminder-emails",
  async (input: FindDueBagRemindersOutput, { container }) => {
    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);

    if (input.finished_ids.length) {
      await service.updateBagReminders(
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

    for (const bag of input.due) {
      let reminder = bag.reminder;

      if (!reminder) {
        const [created] = await service.createBagReminders([
          {
            cart_id: bag.cart_id,
            email: bag.email,
            customer_id: bag.customer_id,
            token: randomBytes(24).toString("hex"),
          },
        ]);

        reminder = { id: created.id, token: created.token, failed_attempts: 0 };
      }

      const reminderNumber = bag.stage + 1;

      try {
        await notifications.createNotifications({
          to: bag.email,
          channel: "email",
          template: EmailTemplates.BAG_REMINDER,
          data: {
            brand,
            reminder_number: reminderNumber,
            total_reminders: bag.total_reminders,
            items: bag.items.map((item) => ({
              title: item.title,
              variant_title: item.variant_title,
              quantity: item.quantity,
              thumbnail: item.thumbnail,
              price:
                item.line_total === null
                  ? null
                  : formatMoney(item.line_total, bag.currency_code) || null,
            })),
            ...bagReminderLinks(reminder.token),
          },
          idempotency_key: `bag-reminder:${reminder.id}:${bag.stage}:${reminder.failed_attempts}`,
        });
      } catch (error) {
        failed += 1;

        const attempts = reminder.failed_attempts + 1;
        const giveUp = attempts >= MAX_FAILED_ATTEMPTS;

        if (giveUp) {
          givenUp += 1;
        }

        await service.updateBagReminders({
          id: reminder.id,
          failed_attempts: attempts,
          ...(giveUp ? { status: "failed" as const } : {}),
        });

        logger.warn(
          `bag-reminders: could not email bag ${bag.cart_id} (attempt ${attempts} of ${MAX_FAILED_ATTEMPTS})${
            giveUp ? "; giving up" : "; retrying on the next run"
          }: ${(error as Error).message}`,
        );

        continue;
      }

      await service.updateBagReminders({
        id: reminder.id,
        reminders_sent: reminderNumber,
        last_sent_at: new Date(),
        failed_attempts: 0,
        status:
          reminderNumber >= bag.total_reminders
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
