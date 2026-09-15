/**
 * TEMPORARY live test for bag reminders; deleted after the run.
 *
 * Creates one guest bag for Resend's test inbox, backdates it, sends only that
 * bag's reminder (other bags are filtered out before sending), exercises
 * restore, stop and settings validation, then deletes everything it created
 * and restores the original settings.
 */
import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { createCartWorkflow } from "@medusajs/medusa/core-flows";

import { BAG_REMINDER_MODULE } from "../modules/bag-reminder";
import type BagReminderModuleService from "../modules/bag-reminder/service";
import { BAG_REMINDER_SETTINGS_ID } from "../modules/bag-reminder/service";
import {
  restoreBagFromReminderWorkflow,
  stopBagRemindersWorkflow,
  updateBagReminderSettingsWorkflow,
} from "../workflows/bag-reminders";
import { findDueBagRemindersStep } from "../workflows/steps/find-due-bag-reminders";
import { sendBagReminderEmailsStep } from "../workflows/steps/send-bag-reminder-emails";

const TEST_EMAIL = "delivered+bag-e2e@resend.dev";

const findOnlyWorkflow = createWorkflow("e2e-bag-reminder-find", function () {
  const found = findDueBagRemindersStep();
  return new WorkflowResponse(found);
});

const sendOnlyTestBagWorkflow = createWorkflow(
  "e2e-bag-reminder-send",
  function (input: { cart_id: string }) {
    const found = findDueBagRemindersStep();
    const onlyTest = transform({ found, input }, ({ found, input }) => ({
      due: found.due.filter((bag) => bag.cart_id === input.cart_id),
      finished_ids: [],
    }));
    const result = sendBagReminderEmailsStep(onlyTest);
    return new WorkflowResponse(result);
  },
);

export default async function run({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const service: BagReminderModuleService =
    container.resolve(BAG_REMINDER_MODULE);

  let failures = 0;
  const check = (name: string, ok: boolean, detail?: unknown) => {
    if (!ok) failures++;
    logger.info(
      `${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? `  -> ${JSON.stringify(detail).slice(0, 400)}` : ""}`,
    );
  };

  const originalSettings = await service.retrieveSettings();
  let cartId: string | null = null;

  const backdate = async (hours: number) => {
    await knex.raw(
      `update cart set updated_at = now() - (? * interval '1 hour') where id = ?`,
      [hours, cartId],
    );
  };

  try {
    // A purchasable variant, region and sales channel.
    const {
      data: [region],
    } = await query.graph({
      entity: "region",
      fields: ["id", "currency_code"],
    });
    const {
      data: [channel],
    } = await query.graph({ entity: "sales_channel", fields: ["id"] });
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "variants.id"],
      filters: { status: "published" },
      pagination: { take: 20 },
    });

    for (const product of products as { variants?: { id: string }[] }[]) {
      for (const variant of product.variants ?? []) {
        try {
          const { result } = await createCartWorkflow(container).run({
            input: {
              region_id: region.id,
              sales_channel_id: channel.id,
              email: TEST_EMAIL,
              items: [{ variant_id: variant.id, quantity: 1 }],
            },
          });
          cartId = result.id;
          break;
        } catch {
          // Try the next variant (no stock, no price, coming soon).
        }
      }
      if (cartId) break;
    }

    check("created a test guest bag with an item", Boolean(cartId));
    if (!cartId) return;

    await updateBagReminderSettingsWorkflow(container).run({
      input: {
        enabled: true,
        first_delay_hours: 1,
        second_delay_hours: 24,
        third_delay_hours: 168,
      },
    });

    // Too recent: not due yet.
    let found = (await findOnlyWorkflow(container).run()).result;
    check(
      "a bag changed just now is not due",
      !found.due.some((bag) => bag.cart_id === cartId),
    );

    await backdate(2);
    found = (await findOnlyWorkflow(container).run()).result;
    const due = found.due.find((bag) => bag.cart_id === cartId);
    check("after 2 hours, the first reminder is due", due?.stage === 0, due);
    check(
      "due bag carries items with prices",
      Boolean(due?.items.length) &&
        due!.items.every((item) => item.title && item.line_total !== null),
      due?.items,
    );
    logger.info(
      `(other bags due right now, not emailed: ${found.due.filter((bag) => bag.cart_id !== cartId).length})`,
    );

    const sent = (
      await sendOnlyTestBagWorkflow(container).run({
        input: { cart_id: cartId },
      })
    ).result;
    check("sent exactly one reminder", sent.sent === 1 && sent.failed === 0, sent);

    const [row] = await service.listBagReminders({ cart_id: cartId });
    check(
      "reminder recorded: 1 sent, active, 48-hex token",
      row?.reminders_sent === 1 &&
        row.status === "active" &&
        /^[0-9a-f]{48}$/.test(row.token) &&
        Boolean(row.last_sent_at),
      row,
    );

    const notifications = container.resolve(Modules.NOTIFICATION);
    const [notification] = await notifications.listNotifications({
      idempotency_key: `bag-reminder:${row.id}:0:0`,
    });
    check(
      "notification created for the test inbox",
      notification?.to === TEST_EMAIL &&
        notification.template === "bag-reminder",
      notification,
    );
    logger.info(`(notification status: ${notification?.status})`);

    found = (await findOnlyWorkflow(container).run()).result;
    check(
      "not due again until 24 hours",
      !found.due.some((bag) => bag.cart_id === cartId),
    );

    await backdate(25);
    found = (await findOnlyWorkflow(container).run()).result;
    check(
      "second reminder due at 24 hours",
      found.due.find((bag) => bag.cart_id === cartId)?.stage === 1,
    );

    const restored = (
      await restoreBagFromReminderWorkflow(container).run({
        input: { token: row.token },
      })
    ).result;
    const [afterRestore] = await service.listBagReminders({ id: row.id });
    check(
      "restore returns the cart and records the click",
      restored.cart_id === cartId && Boolean(afterRestore.restored_at),
      { restored, restored_at: afterRestore.restored_at },
    );

    let unknownError: unknown = null;
    try {
      await restoreBagFromReminderWorkflow(container).run({
        input: { token: "0".repeat(48) },
      });
    } catch (error) {
      unknownError = error;
    }
    check(
      "unknown token is not found",
      (unknownError as { type?: string } | null)?.type === "not_found",
      unknownError && String(unknownError),
    );

    await stopBagRemindersWorkflow(container).run({
      input: { token: row.token },
    });
    await stopBagRemindersWorkflow(container).run({
      input: { token: row.token },
    });
    const optOuts = await service.listBagReminderOptOuts({ email: TEST_EMAIL });
    const [afterStop] = await service.listBagReminders({ id: row.id });
    found = (await findOnlyWorkflow(container).run()).result;
    check(
      "stop (twice) opts out once, stops the bag, and nothing is due",
      optOuts.length === 1 &&
        afterStop.status === "stopped" &&
        !found.due.some((bag) => bag.cart_id === cartId),
      { optOuts: optOuts.length, status: afterStop.status },
    );

    let orderError: unknown = null;
    try {
      await updateBagReminderSettingsWorkflow(container).run({
        input: { second_delay_hours: 1 },
      });
    } catch (error) {
      orderError = error;
    }
    check(
      "settings refuse a second reminder before the first",
      (orderError as { type?: string } | null)?.type === "invalid_data",
      orderError && String(orderError),
    );
    const afterRefused = await service.retrieveSettings();
    check(
      "refused settings change left delays alone",
      afterRefused.second_delay_hours === 24,
      afterRefused,
    );
  } catch (error) {
    failures++;
    logger.error(`test crashed: ${(error as Error).stack}`);
  } finally {
    await service.updateBagReminderSettings([
      {
        id: BAG_REMINDER_SETTINGS_ID,
        enabled: originalSettings.enabled,
        first_delay_hours: originalSettings.first_delay_hours,
        second_delay_hours: originalSettings.second_delay_hours,
        third_delay_hours: originalSettings.third_delay_hours,
      },
    ]);

    if (cartId) {
      const rows = await service.listBagReminders(
        { cart_id: cartId },
        { withDeleted: true },
      );
      if (rows.length) {
        await service.deleteBagReminders(rows.map(({ id }) => id));
      }
      await container.resolve(Modules.CART).deleteCarts([cartId]);
    }

    const optOuts = await service.listBagReminderOptOuts(
      { email: TEST_EMAIL },
      { withDeleted: true },
    );
    if (optOuts.length) {
      await service.deleteBagReminderOptOuts(optOuts.map(({ id }) => id));
    }

    const settingsNow = await service.retrieveSettings();
    logger.info(
      `cleanup: test bag ${cartId ?? "(none)"} deleted, reminder and opt-out rows removed; reminders enabled = ${settingsNow.enabled}`,
    );
    logger.info(failures ? `${failures} FAILED` : "all passed");
  }
}
