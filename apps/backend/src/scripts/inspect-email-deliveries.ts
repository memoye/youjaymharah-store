import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { EMAIL_DELIVERY_MODULE } from "../modules/email-delivery";
import type EmailDeliveryModuleService from "../modules/email-delivery/service";
import { SAFE_RETRY_WINDOW_MS } from "../modules/resend/delivery";

export default async function inspectEmailDeliveries({ container }: ExecArgs) {
  const service: EmailDeliveryModuleService = container.resolve(
    EMAIL_DELIVERY_MODULE,
  );
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  for (const status of [
    "prepared",
    "attempted",
    "accepted",
    "needs_review",
  ] as const) {
    const [, count] = await service.listAndCountEmailDeliveries(
      { status },
      { take: 1, select: ["id"] },
    );
    logger.info(`Email deliveries ${status}: ${count}`);
  }
  const rows = await service.listEmailDeliveries(
    {
      $or: [
        { status: "needs_review" },
        {
          status: "attempted",
          first_attempt_at: {
            $lte: new Date(Date.now() - SAFE_RETRY_WINDOW_MS),
          },
        },
      ],
    },
    {
      take: 100,
      order: { created_at: "ASC" },
      select: ["id", "status", "first_attempt_at", "attempts", "provider_id"],
    },
  );
  logger.info(`Email review candidates (oldest 100): ${JSON.stringify(rows)}`);
}
