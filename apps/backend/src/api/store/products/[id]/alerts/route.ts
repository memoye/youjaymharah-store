import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import type { StoreCreateProductAlertType } from "../../../../middlewares";
import { subscribeToNewsletterWorkflow } from "../../../../../workflows/newsletter";
import { createProductAlertWorkflow } from "../../../../../workflows/product-alerts";

/**
 * "Tell me when I can buy this": a sold-out size, or a coming-soon product.
 * Signed-in customers need no email; a guest must send one. Guests get the
 * same response whether or not the address already had an alert, so the
 * route can't be used to learn who is waiting on what.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateProductAlertType>,
  res: MedusaResponse,
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const customerId = req.auth_context?.actor_id || null;

  let email = req.validatedBody.email;

  if (customerId) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: ["email"],
      filters: { id: customerId },
    });

    email = customer?.email ?? undefined;
  }

  if (!email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "An email address is required.",
    );
  }

  const salesChannelId = req.publishable_key_context?.sales_channel_ids?.[0];

  if (!salesChannelId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The publishable API key has no sales channel.",
    );
  }

  const { result: alert } = await createProductAlertWorkflow(req.scope).run({
    input: {
      email,
      customer_id: customerId,
      product_id: req.params.id,
      variant_id: req.validatedBody.variant_id ?? null,
      sales_channel_id: salesChannelId,
    },
  });

  // Separate consent: the alert is already saved, so a closed or failing
  // newsletter signup must not undo it.
  if (req.validatedBody.marketing_opt_in) {
    try {
      await subscribeToNewsletterWorkflow(req.scope).run({
        input: { email, source: "product_alert" },
      });
    } catch (error) {
      logger.warn(
        `product-alerts: newsletter opt-in for ${email} was not recorded: ${
          (error as Error).message
        }`,
      );
    }
  }

  res.json({ success: true, alert: customerId ? alert : null });
};
