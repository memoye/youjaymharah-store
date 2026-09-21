import { ResendAudienceClient } from "../resend-audience";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

it("creates a new contact when the SDK returns not_found without statusCode", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ name: "not_found", message: "Contact not found" }),
        { status: 404 },
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "new-contact" })));
  expect(
    await new ResendAudienceClient("re_test").addContact({
      email: "buyer@example.com",
      audienceId: "segment",
    }),
  ).toBe("new-contact");
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual(
    { email: "buyer@example.com", segments: [{ id: "segment" }] },
  );
});

it("treats unsubscribing an absent contact as already complete", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ name: "not_found", message: "Contact not found" }),
        { status: 404 },
      ),
    );
  await expect(
    new ResendAudienceClient("re_test").unsubscribeContact({
      email: "buyer@example.com",
      audienceId: "segment",
    }),
  ).resolves.toBeUndefined();
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
