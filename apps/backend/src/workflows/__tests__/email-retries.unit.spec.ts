import type { MedusaContainer } from "@medusajs/framework/types";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { preparePasswordResetEmailStep } from "../steps/prepare-password-reset-email";
import { prepareVerificationEmailStep } from "../steps/prepare-verification-email";
import { prepareInviteEmailStep } from "../steps/prepare-invite-email";
import { prepareRefundIssuedEmailStep } from "../steps/prepare-refund-issued-email";
import { prepareOrderUpdatedEmailStep } from "../steps/prepare-order-updated-email";
import {
  PreparedEmail,
  sendPreparedEmailStep,
} from "../steps/send-prepared-email";

jest.mock("@medusajs/framework/workflows-sdk", () => ({
  ...jest.requireActual("@medusajs/framework/workflows-sdk"),
  createStep: jest.fn((_config, handler) => handler),
}));

function fixture() {
  const order = {
    id: "order_1",
    email: "buyer@example.com",
    no_notification: false,
    items: [],
    total: 100,
  };
  const invite = {
    id: "invite_1",
    email: "staff@example.com",
    token: "invite-secret",
    accepted: false,
  };
  const graph = jest.fn(async ({ entity, filters }) => ({
    data:
      entity === "refund"
        ? [
            {
              id: filters.id,
              amount: filters.id === "ref_1" ? 20 : 30,
              payment: {
                id: "pay_1",
                currency_code: "ngn",
                payment_collection: { order: { id: order.id } },
              },
            },
          ]
        : [{ ...order }],
  }));
  const createNotifications = jest.fn().mockResolvedValue({});
  const retrieveSettings = jest.fn().mockResolvedValue({ name: "Store" });
  const services = {
    query: { graph },
    notification: { createNotifications },
    branding: { retrieveSettings },
    user: { retrieveInvite: jest.fn(async () => ({ ...invite })) },
    logger: { info: jest.fn() },
  };
  const container = {
    resolve: (key: string) => services[key],
  } as unknown as MedusaContainer;
  async function run<T = PreparedEmail<Record<string, unknown>>>(
    step: unknown,
    input: unknown,
  ): Promise<T> {
    return (
      await (
        step as (
          input: unknown,
          context: { container: MedusaContainer },
        ) => Promise<StepResponse<T>>
      )(input, { container })
    ).output;
  }
  return { run, order, invite, graph, createNotifications, retrieveSettings };
}
const key = (prepared: PreparedEmail<unknown>) =>
  prepared.notification?.provider_data?.idempotency_key;

it("keys password reset retries by actor, recipient and token without exposing credentials", async () => {
  const { run } = fixture();
  const input = {
    email: "buyer@example.com",
    token: "private-reset-token",
    actor_type: "customer",
  };
  const first = await run(preparePasswordResetEmailStep, input);
  expect(key(first)).toBe(key(await run(preparePasswordResetEmailStep, input)));
  expect(key(first)).not.toBe(
    key(
      await run(preparePasswordResetEmailStep, {
        ...input,
        token: "new-token",
      }),
    ),
  );
  expect(key(first)).not.toBe(
    key(
      await run(preparePasswordResetEmailStep, {
        ...input,
        actor_type: "user",
      }),
    ),
  );
  expect(key(first)).not.toContain(input.token);
  expect(key(first)).not.toContain(input.email);
  expect(first.notification?.idempotency_key).toBeUndefined();
});

it("keeps verification content and keys stable as time passes", async () => {
  const { run } = fixture();
  const input = {
    email: "buyer@example.com",
    token: "verify-secret",
    expires_at: "2027-01-01T00:00:00.000Z",
  };
  const first = await run(prepareVerificationEmailStep, input);
  const clock = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 120_000);
  try {
    expect(await run(prepareVerificationEmailStep, input)).toEqual(first);
  } finally {
    clock.mockRestore();
  }
  expect(first.notification?.data?.expires_at).toBe(input.expires_at);
  expect(key(first)).not.toBe(
    key(
      await run(prepareVerificationEmailStep, {
        ...input,
        token: "new-verify-secret",
      }),
    ),
  );
});

it("gives renewed invites a new key and skips accepted invitations", async () => {
  const { run, invite } = fixture();
  const first = await run(prepareInviteEmailStep, { id: invite.id });
  expect(key(first)).toBe(
    key(await run(prepareInviteEmailStep, { id: invite.id })),
  );
  invite.token = "renewed-secret";
  expect(key(first)).not.toBe(
    key(await run(prepareInviteEmailStep, { id: invite.id })),
  );
  invite.accepted = true;
  expect(
    (await run(prepareInviteEmailStep, { id: invite.id })).notification,
  ).toBeNull();
});

it("retrieves the event's exact refund and separates partial-refund deliveries", async () => {
  const { run, graph } = fixture();
  const first = await run(prepareRefundIssuedEmailStep, { refund_id: "ref_1" });
  const second = await run(prepareRefundIssuedEmailStep, {
    refund_id: "ref_2",
  });
  expect(first.notification?.data?.refund).toMatchObject({
    id: "ref_1",
    amount: 20,
  });
  expect(second.notification?.data?.refund).toMatchObject({
    id: "ref_2",
    amount: 30,
  });
  expect(key(first)).not.toBe(key(second));
  expect(key(first)).toBe(
    key(await run(prepareRefundIssuedEmailStep, { refund_id: "ref_1" })),
  );
  expect(graph).toHaveBeenCalledWith(
    expect.objectContaining({ entity: "refund", filters: { id: "ref_1" } }),
  );
});

it("keys order updates by edit actions, independent of array ordering", async () => {
  const { run } = fixture();
  const first = await run(prepareOrderUpdatedEmailStep, {
    order_id: "order_1",
    action_ids: ["act_2", "act_1"],
  });
  expect(key(first)).toBe(
    key(
      await run(prepareOrderUpdatedEmailStep, {
        order_id: "order_1",
        action_ids: ["act_1", "act_2"],
      }),
    ),
  );
  expect(key(first)).not.toBe(
    key(
      await run(prepareOrderUpdatedEmailStep, {
        order_id: "order_1",
        action_ids: ["act_3"],
      }),
    ),
  );
  await expect(
    run(prepareOrderUpdatedEmailStep, { order_id: "order_1", action_ids: [] }),
  ).rejects.toThrow("missing stable edit");
});

it("does not prepare mail for a missing or rolled-back refund", async () => {
  const { run, graph, createNotifications } = fixture();
  graph.mockResolvedValue({ data: [] });
  await expect(
    run(prepareRefundIssuedEmailStep, { refund_id: "removed-refund" }),
  ).rejects.toThrow("could not be retrieved");
  expect(createNotifications).not.toHaveBeenCalled();
});

it("does not prepare refund or edit mail when order notifications are disabled", async () => {
  const { run, order } = fixture();
  order.no_notification = true;
  expect(
    (await run(prepareRefundIssuedEmailStep, { refund_id: "ref_1" }))
      .notification,
  ).toBeNull();
  expect(
    (
      await run(prepareOrderUpdatedEmailStep, {
        order_id: order.id,
        action_ids: ["act_1"],
      })
    ).notification,
  ).toBeNull();
});

it("retries the prepared snapshot without re-reading the invite or branding", async () => {
  const { run, invite, createNotifications, retrieveSettings } = fixture();
  const prepared = await run(prepareInviteEmailStep, { id: invite.id });
  // Simulates the workflow engine persisting and restoring the preparation output.
  const persisted = JSON.parse(JSON.stringify(prepared));
  invite.token = "later-token";
  retrieveSettings.mockResolvedValue({ name: "Changed store" });
  createNotifications.mockRejectedValueOnce(new Error("response lost"));
  await expect(
    run(sendPreparedEmailStep, persisted.notification),
  ).rejects.toThrow("response lost");
  await run(sendPreparedEmailStep, persisted.notification);
  expect(createNotifications.mock.calls[0][0]).toEqual(
    createNotifications.mock.calls[1][0],
  );
  expect(retrieveSettings).toHaveBeenCalledTimes(1);
});

it("does not call the provider for a skipped email and retains workflow retries", async () => {
  const { run, createNotifications } = fixture();
  await run(sendPreparedEmailStep, null);
  expect(createNotifications).not.toHaveBeenCalled();
  expect(createStep).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "send-prepared-email",
      maxRetries: 5,
      retryInterval: 15,
    }),
    expect.any(Function),
  );
});
