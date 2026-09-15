import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BAG_REMINDER_MODULE } from "../../modules/bag-reminder";
import type BagReminderModuleService from "../../modules/bag-reminder/service";

export type BagReminderTokenInput = { token: string };

const EXPIRED =
  "This link has expired. Your shopping bag may have been checked out or cleared.";

/**
 * Resolves the "View your bag" link to its cart, and records the first time
 * it was used. Refuses a bag that has since been checked out.
 */
export const restoreBagFromReminderStep = createStep(
  "restore-bag-from-reminder",
  async (input: BagReminderTokenInput, { container }) => {
    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);

    const [reminder] = await service.listBagReminders({ token: input.token });

    if (!reminder) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, EXPIRED);
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const {
      data: [cart],
    } = await query.graph({
      entity: "cart",
      fields: ["id", "completed_at"],
      filters: { id: reminder.cart_id },
    });

    if (!cart || cart.completed_at) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, EXPIRED);
    }

    if (!reminder.restored_at) {
      await service.updateBagReminders({
        id: reminder.id,
        restored_at: new Date(),
      });
    }

    return new StepResponse({ cart_id: reminder.cart_id });
  },
);

type StopCompensation = {
  opt_out_id: string | null;
  stopped_ids: string[];
};

/**
 * The "Stop bag reminders" link: no more reminders to this address, for this
 * bag or any other. Using the link again changes nothing.
 */
export const stopBagRemindersStep = createStep(
  "stop-bag-reminders",
  async (input: BagReminderTokenInput, { container }) => {
    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);

    const [reminder] = await service.listBagReminders({ token: input.token });

    if (!reminder) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This link is no longer valid.",
      );
    }

    const email = reminder.email.toLowerCase();
    const [existing] = await service.listBagReminderOptOuts({ email });

    const created = existing
      ? null
      : (await service.createBagReminderOptOuts([{ email }]))[0];

    const active = await service.listBagReminders(
      { email, status: "active" },
      { select: ["id"] },
    );

    if (active.length) {
      await service.updateBagReminders(
        active.map(({ id }) => ({ id, status: "stopped" as const })),
      );
    }

    return new StepResponse<{ status: "stopped" }, StopCompensation>(
      { status: "stopped" },
      {
        opt_out_id: created?.id ?? null,
        stopped_ids: active.map(({ id }) => id),
      },
    );
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }

    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);

    if (compensation.opt_out_id) {
      await service.deleteBagReminderOptOuts([compensation.opt_out_id]);
    }

    if (compensation.stopped_ids.length) {
      await service.updateBagReminders(
        compensation.stopped_ids.map((id) => ({
          id,
          status: "active" as const,
        })),
      );
    }
  },
);

/**
 * Credits a reminder when its bag becomes an order. Only bags that were
 * actually reminded count; a bag checked out before any reminder isn't a
 * recovery.
 */
export const markBagRecoveredStep = createStep(
  "mark-bag-recovered",
  async (input: { order_id: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "cart.id"],
      filters: { id: input.order_id },
    });

    const cartId = (order as { cart?: { id?: string } | null } | undefined)
      ?.cart?.id;

    if (!cartId) {
      return new StepResponse(null);
    }

    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);
    const [reminder] = await service.listBagReminders({ cart_id: cartId });

    if (
      !reminder ||
      reminder.reminders_sent < 1 ||
      !["active", "finished"].includes(reminder.status)
    ) {
      return new StepResponse(null);
    }

    await service.updateBagReminders({
      id: reminder.id,
      status: "recovered",
      recovered_at: new Date(),
      order_id: input.order_id,
    });

    return new StepResponse(reminder.id, {
      id: reminder.id,
      status: reminder.status,
    });
  },
  async (previous, { container }) => {
    if (!previous) {
      return;
    }

    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);

    await service.updateBagReminders({
      id: previous.id,
      status: previous.status,
      recovered_at: null,
      order_id: null,
    });
  },
);
