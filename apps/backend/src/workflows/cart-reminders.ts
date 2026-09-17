import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  type CartReminderTokenInput,
  markCartRecoveredStep,
  restoreCartFromReminderStep,
  stopCartRemindersStep,
} from "./steps/cart-reminder-links";
import { findDueCartRemindersStep } from "./steps/find-due-cart-reminders";
import { sendCartReminderEmailsStep } from "./steps/send-cart-reminder-emails";
import {
  updateCartReminderSettingsStep,
  type UpdateCartReminderSettingsInput,
} from "./steps/update-cart-reminder-settings";

/**
 * Run by jobs/send-cart-reminders.ts. Checks carts by their last change rather
 * than reacting to cart events, so a shopper who edits their cart simply moves
 * the next reminder later.
 */
export const sendDueCartRemindersWorkflow = createWorkflow(
  "send-due-cart-reminders",
  function () {
    const found = findDueCartRemindersStep();
    const result = sendCartReminderEmailsStep(found);

    return new WorkflowResponse(result);
  },
);

export const restoreCartFromReminderWorkflow = createWorkflow(
  "restore-cart-from-reminder",
  function (input: CartReminderTokenInput) {
    const result = restoreCartFromReminderStep(input);

    return new WorkflowResponse(result);
  },
);

export const stopCartRemindersWorkflow = createWorkflow(
  "stop-cart-reminders",
  function (input: CartReminderTokenInput) {
    const result = stopCartRemindersStep(input);

    return new WorkflowResponse(result);
  },
);

export const markCartRecoveredWorkflow = createWorkflow(
  "mark-cart-recovered",
  function (input: { order_id: string }) {
    const result = markCartRecoveredStep(input);

    return new WorkflowResponse(result);
  },
);

export const updateCartReminderSettingsWorkflow = createWorkflow(
  "update-cart-reminder-settings",
  function (input: UpdateCartReminderSettingsInput) {
    const settings = updateCartReminderSettingsStep(input);

    return new WorkflowResponse(settings);
  },
);
