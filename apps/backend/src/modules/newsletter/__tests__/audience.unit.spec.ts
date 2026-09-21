import { ResendAudienceClient } from "../resend-audience";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

it("does not re-enable an externally unsubscribed contact", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ id: "contact", unsubscribed: true })),
    );
  await expect(
    new ResendAudienceClient("re_test").addContact({
      email: "buyer@example.com",
      audienceId: "segment",
    }),
  ).rejects.toThrow("unsubscribed in Resend");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("adds an existing subscribed contact to the segment without rewriting consent", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "contact", unsubscribed: false })),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "contact" })));
  expect(
    await new ResendAudienceClient("re_test").addContact({
      email: "buyer@example.com",
      audienceId: "segment",
    }),
  ).toBe("contact");
  expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
    "/contacts/contact/segments/segment",
  );
  expect((global.fetch as jest.Mock).mock.calls[1][1].body).toBeUndefined();
});

it("does not create a contact if the consent lookup fails", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Unavailable", name: "application_error" }),
        { status: 500 },
      ),
    );
  await expect(
    new ResendAudienceClient("re_test").addContact({
      email: "buyer@example.com",
      audienceId: "segment",
    }),
  ).rejects.toThrow("Could not check");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
