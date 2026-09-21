import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import type { ResendConsentEvent } from "../modules/newsletter/resend-webhook";
import { processResendWebhookStep } from "./steps/process-resend-webhook";

export const processResendWebhookWorkflow = createWorkflow(
  "process-resend-webhook",
  (input: ResendConsentEvent) =>
    new WorkflowResponse(processResendWebhookStep(input)),
);
