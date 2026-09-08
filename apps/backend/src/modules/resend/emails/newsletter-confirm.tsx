import { Button, Container, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import type { BrandSummary } from "./constants";

export type NewsletterConfirmEmailProps = {
  /** Link that flips the subscriber from pending to subscribed. */
  confirm_url: string;
  brand?: BrandSummary;
};

function NewsletterConfirmEmailComponent({
  confirm_url,
  brand,
}: NewsletterConfirmEmailProps) {
  return (
    <EmailLayout
      brand={brand}
      preview="Confirm your subscription"
      heading="One more step"
      intro="Confirm this address and we will add you to the list."
    >
      <Container className="px-6">
        <Section className="my-6 text-center">
          <Button
            href={confirm_url}
            className="rounded-lg bg-[#27272a] px-6 py-3 font-semibold text-white"
          >
            Confirm subscription
          </Button>
        </Section>

        <Text className="text-gray-600">
          If the button does not work, paste this address into your browser:
        </Text>
        <Text className="break-all text-sm text-blue-600">{confirm_url}</Text>

        <Text className="mt-6 text-gray-600">
          If you did not sign up, ignore this email. Nothing will be sent to you
          unless you confirm.
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const newsletterConfirmEmail = (props: NewsletterConfirmEmailProps) => (
  <NewsletterConfirmEmailComponent {...props} />
);

export default () => (
  <NewsletterConfirmEmailComponent confirm_url="https://example.com/newsletter/confirm?token=abc123" />
);
