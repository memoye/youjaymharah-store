import { Button, Container, Section, Text } from "react-email";

import { EmailLayout } from "./components/layout";
import type { BrandSummary } from "./constants";
import { STORE_NAME } from "./constants";

export type EmailVerificationEmailProps = {
  /** Fully-formed verification link. The sending step builds it from the token. */
  url: string;
  email?: string;
  /** How long the link stays valid, for the copy only. */
  expires_in?: string;
  expires_at?: string;
  /** Live store branding, supplied by the sending step. */
  brand?: BrandSummary;
};

function EmailVerificationEmailComponent({
  url,
  email,
  expires_in,
  expires_at,
  brand,
}: EmailVerificationEmailProps) {
  const storeName = brand?.name || STORE_NAME;

  return (
    <EmailLayout
      brand={brand}
      preview={`Confirm your email address for ${storeName}`}
      heading="Confirm your email address"
      intro={
        email
          ? `Confirm that ${email} belongs to you to finish setting up your ${storeName} account.`
          : `Confirm your email address to finish setting up your ${storeName} account.`
      }
    >
      <Container className="px-6">
        <Section className="my-6 text-center">
          <Button
            href={url}
            className="rounded-lg bg-[#27272a] px-6 py-3 font-semibold text-white"
          >
            Confirm email address
          </Button>
        </Section>

        <Text className="text-gray-600">
          {expires_at
            ? `This link expires at ${new Date(expires_at).toUTCString()}.`
            : expires_in
              ? `This link expires in ${expires_in}.`
              : "This link expires shortly for your security."}{" "}
          If the button does not work, paste this address into your browser:
        </Text>
        <Text className="text-sm break-all text-blue-600">{url}</Text>

        <Text className="mt-6 text-gray-600">
          If you did not create an account, you can ignore this email.
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const emailVerificationEmail = (props: EmailVerificationEmailProps) => (
  <EmailVerificationEmailComponent {...props} />
);

export default function EmailVerificationEmailPreview() {
  return (
    <EmailVerificationEmailComponent
      url="https://example.com/account/verify?token=abc123"
      email="ada@example.com"
      expires_in="15 minutes"
    />
  );
}
