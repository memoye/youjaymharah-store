import { Button, Container, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import type { BrandSummary } from "./constants";
import { STORE_NAME } from "./constants";

export type PasswordResetEmailProps = {
  /** Fully-formed reset link. The subscriber builds it from the reset token. */
  url: string;
  email?: string;
  /** How long the link stays valid, for the copy only. */
  expires_in?: string;
  /** Live store branding, supplied by the sending subscriber. */
  brand?: BrandSummary;
};

function PasswordResetEmailComponent({
  url,
  email,
  expires_in,
  brand,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout
      brand={brand}
      preview={`Reset your ${STORE_NAME} password`}
      heading="Reset your password"
      intro={
        email
          ? `A password reset was requested for ${email}.`
          : "A password reset was requested for your account."
      }
    >
      <Container className="px-6">
        <Section className="text-center my-6">
          <Button
            href={url}
            className="bg-[#27272a] text-white rounded-lg px-6 py-3 font-semibold"
          >
            Choose a new password
          </Button>
        </Section>

        <Text className="text-gray-600">
          {expires_in
            ? `This link expires in ${expires_in}.`
            : "This link expires shortly for your security."}{" "}
          If the button does not work, paste this address into your browser:
        </Text>
        <Text className="text-sm text-blue-600 break-all">{url}</Text>

        <Text className="text-gray-600 mt-6">
          If you did not ask to reset your password, you can ignore this email
          and nothing will change.
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const passwordResetEmail = (props: PasswordResetEmailProps) => (
  <PasswordResetEmailComponent {...props} />
);

export default () => (
  <PasswordResetEmailComponent
    url="https://example.com/reset-password?token=abc123"
    email="ada@example.com"
    expires_in="15 minutes"
  />
);
