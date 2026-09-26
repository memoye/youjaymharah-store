import { describeSendFailure } from "../send-failure";

describe("describeSendFailure", () => {
  it("keeps Resend's code, status and reason", () => {
    expect(
      describeSendFailure({
        name: "invalid_api_key",
        statusCode: 401,
        message: "API key is invalid",
      }),
    ).toBe("invalid_api_key 401: API key is invalid");
  });

  it("blanks every email address in the message", () => {
    const line = describeSendFailure({
      name: "validation_error",
      statusCode: 403,
      message:
        "You can only send testing emails to your own email address (owner@example.com). To send to buyer@example.com, verify a domain.",
    });

    expect(line).not.toContain("owner@example.com");
    expect(line).not.toContain("buyer@example.com");
    expect(line).toBe(
      "validation_error 403: You can only send testing emails to your own email address ([email]). To send to [email], verify a domain.",
    );
  });

  it("keeps domain names, which are what a domain error is about", () => {
    expect(
      describeSendFailure({
        name: "validation_error",
        statusCode: 403,
        message: "The test.example.com domain is not verified.",
      }),
    ).toContain("test.example.com domain is not verified");
  });

  it("describes a network failure, whose status is null", () => {
    expect(
      describeSendFailure({
        name: "application_error",
        statusCode: null,
        message: "Unable to fetch data. The request could not be resolved.",
      }),
    ).toBe(
      "application_error: Unable to fetch data. The request could not be resolved.",
    );
  });

  it("describes a thrown error without its address", () => {
    expect(
      describeSendFailure(new Error("request timed out for buyer@example.com")),
    ).toBe("Error: request timed out for [email]");
  });

  it.each([undefined, null, "boom", 42, {}])(
    "falls back when there is nothing to report: %p",
    (value) => {
      expect(describeSendFailure(value)).toBe("no reason given");
    },
  );
});
