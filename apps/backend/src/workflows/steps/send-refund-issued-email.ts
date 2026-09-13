import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import type { RefundSummary } from "../../modules/resend/emails/refund-issued";

export type SendRefundIssuedEmailInput = {
  /** The refunded payment (payment.refunded's `id`). */
  payment_id: string;
};

export type SendRefundIssuedEmailOutput = {
  payment_id: string;
  refund_id: string | null;
  order_id: string | null;
  sent_to: string | null;
};

export const sendRefundIssuedEmailStep = createStep(
  {
    name: "send-refund-issued-email",
    // Transient Resend/network failures are retried by the workflow engine.
    // Permanent conditions below use StepResponse.permanentFailure instead.
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendRefundIssuedEmailInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION);
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);

    const {
      data: [payment],
    } = await query.graph({
      entity: "payment",
      fields: [
        "id",
        "currency_code",
        "refunds.id",
        "refunds.amount",
        "refunds.created_at",
        // The label only: a refund's `note` is written for staff, not customers.
        "refunds.refund_reason.label",
        "payment_collection.order.id",
      ],
      filters: { id: input.payment_id },
    });

    if (!payment) {
      return StepResponse.permanentFailure(
        `send-refund-issued-email: payment ${input.payment_id} could not be retrieved.`,
      );
    }

    // The event names the payment, not the refund, so the newest refund is the
    // one that raised it. Two refunds recorded in the same instant would both
    // read the newer one; staff issue refunds one at a time, so that is
    // accepted rather than tracked.
    const [refund] = (payment.refunds ?? [])
      .filter((candidate) => Boolean(candidate))
      .sort(
        (a, b) =>
          new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime(),
      );
    const orderId = payment.payment_collection?.order?.id;

    if (!refund || !orderId) {
      logger.info(
        `send-refund-issued-email: payment ${payment.id} has no refund or no order; skipping.`,
      );
      return new StepResponse<SendRefundIssuedEmailOutput>({
        payment_id: payment.id,
        refund_id: refund?.id ?? null,
        order_id: orderId ?? null,
        sent_to: null,
      });
    }

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      // Exactly the fields the refund-issued template reads.
      fields: [
        "id",
        "display_id",
        "email",
        "no_notification",
        "currency_code",
        "customer.first_name",
        "customer.email",
        "shipping_address.first_name",
      ],
      filters: { id: orderId },
    });

    if (!order) {
      return StepResponse.permanentFailure(
        `send-refund-issued-email: order ${orderId} could not be retrieved.`,
      );
    }

    const recipient = order.email ?? order.customer?.email;

    if (!recipient || order.no_notification) {
      logger.info(
        `send-refund-issued-email: order ${order.id} has no email or has notifications off; skipping.`,
      );
      return new StepResponse<SendRefundIssuedEmailOutput>({
        payment_id: payment.id,
        refund_id: refund.id,
        order_id: order.id,
        sent_to: null,
      });
    }

    const summary: RefundSummary = {
      id: refund.id,
      amount: Number(refund.amount),
      currency_code: payment.currency_code,
      reason: refund.refund_reason?.label ?? null,
    };

    const brand = await brandingModuleService.retrieveSettings();

    // Deliberately not caught: a throw is what schedules the retry.
    await notificationModuleService.createNotifications({
      to: recipient,
      channel: "email",
      template: EmailTemplates.REFUND_ISSUED,
      data: { order, refund: summary, brand },
    });

    logger.info(
      `send-refund-issued-email: refund email sent to ${recipient} for order #${order.display_id}.`,
    );

    return new StepResponse<SendRefundIssuedEmailOutput>({
      payment_id: payment.id,
      refund_id: refund.id,
      order_id: order.id,
      sent_to: recipient,
    });
  },
);
