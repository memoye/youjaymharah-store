import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  type BagReminderTokenInput,
  markBagRecoveredStep,
  restoreBagFromReminderStep,
  stopBagRemindersStep,
} from "./steps/bag-reminder-links";
import { findDueBagRemindersStep } from "./steps/find-due-bag-reminders";
import { sendBagReminderEmailsStep } from "./steps/send-bag-reminder-emails";
import {
  updateBagReminderSettingsStep,
  type UpdateBagReminderSettingsInput,
} from "./steps/update-bag-reminder-settings";

/**
 * Run by jobs/send-bag-reminders.ts. Checks carts by their last change rather
 * than reacting to cart events, so a shopper who edits their bag simply moves
 * the next reminder later.
 */
export const sendDueBagRemindersWorkflow = createWorkflow(
  "send-due-bag-reminders",
  function () {
    const found = findDueBagRemindersStep();
    const result = sendBagReminderEmailsStep(found);

    return new WorkflowResponse(result);
  },
);

export const restoreBagFromReminderWorkflow = createWorkflow(
  "restore-bag-from-reminder",
  function (input: BagReminderTokenInput) {
    const result = restoreBagFromReminderStep(input);

    return new WorkflowResponse(result);
  },
);

export const stopBagRemindersWorkflow = createWorkflow(
  "stop-bag-reminders",
  function (input: BagReminderTokenInput) {
    const result = stopBagRemindersStep(input);

    return new WorkflowResponse(result);
  },
);

export const markBagRecoveredWorkflow = createWorkflow(
  "mark-bag-recovered",
  function (input: { order_id: string }) {
    const result = markBagRecoveredStep(input);

    return new WorkflowResponse(result);
  },
);

export const updateBagReminderSettingsWorkflow = createWorkflow(
  "update-bag-reminder-settings",
  function (input: UpdateBagReminderSettingsInput) {
    const settings = updateBagReminderSettingsStep(input);

    return new WorkflowResponse(settings);
  },
);
