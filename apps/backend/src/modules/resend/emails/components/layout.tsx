import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import type { ReactNode } from "react";

import { STORE_NAME, SUPPORT_EMAIL, type BrandSummary } from "../constants";

type EmailLayoutProps = {
  preview: string;
  heading: string;
  intro?: string;
  children?: ReactNode;
  /** Live branding from the `branding` module; falls back to env defaults. */
  brand?: BrandSummary;
};

/**
 * Shared shell for transactional emails: dark header, centred heading, and a
 * footer carrying the support address. Templates supply only their own body.
 */
export function EmailLayout({
  preview,
  heading,
  intro,
  children,
  brand,
}: EmailLayoutProps) {
  const storeName = brand?.name || STORE_NAME;
  const supportEmail = brand?.support_email || SUPPORT_EMAIL;
  const logoUrl = brand?.logo_url;

  return (
    <Tailwind>
      <Html className="bg-gray-100 font-sans">
        <Head />
        <Preview>{preview}</Preview>
        <Body className="mx-auto my-10 w-full max-w-2xl bg-white">
          <Section className="bg-[#27272a] px-6 py-4">
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt={storeName}
                height="28"
                className="h-7 w-auto object-contain"
              />
            ) : (
              <Text className="m-0 text-lg font-semibold text-white">
                {storeName}
              </Text>
            )}
          </Section>

          <Container className="p-6">
            <Heading className="text-center text-2xl font-bold text-gray-800">
              {heading}
            </Heading>
            {intro && (
              <Text className="mt-2 text-center text-gray-600">{intro}</Text>
            )}
          </Container>

          {children}

          <Section className="mt-10 bg-gray-50 p-6">
            <Text className="text-center text-sm text-gray-500">
              Questions? Reply to this email or contact us at {supportEmail}.
            </Text>
            <Text className="mt-4 text-center text-xs text-gray-400">
              {new Date().getFullYear()} {storeName}. All rights reserved.
            </Text>
          </Section>
        </Body>
      </Html>
    </Tailwind>
  );
}

export default function EmailLayoutPreview() {
  return (
    <EmailLayout
      preview="Layout preview"
      heading="Heading"
      intro="Supporting line under the heading."
    >
      <Container className="px-6">
        <Text className="text-gray-600">Body content goes here.</Text>
      </Container>
    </EmailLayout>
  );
}
