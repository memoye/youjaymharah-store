import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import type { OrderUpdateSummary } from "../../modules/resend/emails/order-updated";

export type SendOrderUpdatedEmailInput = {
  /** order-edit.confirmed's `order_id`. */
  order_id: string;
};

export type SendOrderUpdatedEmailOutput = {
  order_id: string;
  sent_to: string | null;
};

export const sendOrderUpdatedEmailStep = createStep(
  {
    name: "send-order-updated-email",
    // Transient Resend/network failures are retried by the workflow engine.
    // Permanent conditions below use StepResponse.permanentFailure instead.
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendOrderUpdatedEmailInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION);
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      // Exactly the fields the order-updated template reads. The edit is
      // already applied when this runs, so these are the post-edit values.
      fields: [
        "id",
        "display_id",
        "email",
        "no_notification",
        "currency_code",
        "total",
        "customer.first_name",
        "customer.email",
        "shipping_address.first_name",
        "items.product_title",
        "items.variant_title",
        "items.quantity",
        "summary.pending_difference",
        "summary.current_order_total",
      ],
      filters: { id: input.order_id },
    });

    if (!order) {
      return StepResponse.permanentFailure(
        `send-order-updated-email: order ${input.order_id} could not be retrieved.`,
      );
    }

    const recipient = order.email ?? order.customer?.email;

    if (!recipient || order.no_notification) {
      logger.info(
        `send-order-updated-email: order ${order.id} has no email or has notifications off; skipping.`,
      );
      return new StepResponse<SendOrderUpdatedEmailOutput>({
        order_id: order.id,
        sent_to: null,
      });
    }

    const update: OrderUpdateSummary = {
      items: (order.items ?? [])
        .map((item) => ({
          title: item?.product_title,
          variant_title: item?.variant_title,
          quantity: Number(item?.quantity ?? 0),
        }))
        // A removed item can remain on the order at quantity zero.
        .filter((item) => item.quantity > 0),
      total: Number(order.summary?.current_order_total ?? order.total ?? 0),
      pending_difference: Number(order.summary?.pending_difference ?? 0),
    };

    const brand = await brandingModuleService.retrieveSettings();

    // Deliberately not caught: a throw is what schedules the retry.
    await notificationModuleService.createNotifications({
      to: recipient,
      channel: "email",
      template: EmailTemplates.ORDER_UPDATED,
      data: { order, update, brand },
    });

    logger.info(
      `send-order-updated-email: order update email sent to ${recipient} for order #${order.display_id}.`,
    );

    return new StepResponse<SendOrderUpdatedEmailOutput>({
      order_id: order.id,
      sent_to: recipient,
    });
  },
);
