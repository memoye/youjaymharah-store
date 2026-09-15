import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { BAG_REMINDER_MODULE } from "../../../../modules/bag-reminder";
import type BagReminderModuleService from "../../../../modules/bag-reminder/service";

const DAYS = 30;

function toNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(
          String((value as { toString?(): string })?.toString?.() ?? ""),
        );

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The last 30 days of bag reminders: bags reminded, bags reopened from an
 * email, orders placed from reminded bags and what they were worth, and
 * addresses that stopped reminders.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: BagReminderModuleService =
    req.scope.resolve(BAG_REMINDER_MODULE);
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const one = { take: 1, select: ["id"] };

  const [[, reminded], [, opened], [recovered, recoveredCount], [, stopped]] =
    await Promise.all([
      service.listAndCountBagReminders({ last_sent_at: { $gte: since } }, one),
      service.listAndCountBagReminders({ restored_at: { $gte: since } }, one),
      service.listAndCountBagReminders(
        { recovered_at: { $gte: since } },
        { select: ["order_id"] },
      ),
      service.listAndCountBagReminderOptOuts(
        { created_at: { $gte: since } },
        one,
      ),
    ]);

  const orderIds = recovered
    .map((row) => row.order_id)
    .filter((id): id is string => Boolean(id));

  const revenue = new Map<string, number>();

  if (orderIds.length) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "total", "currency_code"],
      filters: { id: orderIds },
    });

    for (const order of data as { total: unknown; currency_code: string }[]) {
      const code = order.currency_code.toLowerCase();
      revenue.set(code, (revenue.get(code) ?? 0) + toNumber(order.total));
    }
  }

  res.json({
    stats: {
      since: since.toISOString(),
      bags_reminded: reminded,
      bags_opened: opened,
      orders_recovered: recoveredCount,
      revenue_recovered: [...revenue].map(([currency_code, amount]) => ({
        currency_code,
        amount,
      })),
      stopped,
    },
  });
};
