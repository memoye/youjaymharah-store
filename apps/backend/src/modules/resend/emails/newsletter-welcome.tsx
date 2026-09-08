import { Container, Link, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import type { BrandSummary } from "./constants";

export type NewsletterWelcomeEmailProps = {
  /** Required in every marketing email, not just polite to include. */
  unsubscribe_url: string;
  brand?: BrandSummary;
};

function NewsletterWelcomeEmailComponent({
  unsubscribe_url,
  brand,
}: NewsletterWelcomeEmailProps) {
  return (
    <EmailLayout
      brand={brand}
      preview="You are on the list"
      heading="You are on the list"
      intro="Thanks for subscribing. New arrivals and occasional offers, nothing else."
    >
      <Container className="px-6">
        <Text className="text-gray-600">
          We will only email you when there is something worth opening.
        </Text>
        <Text className="mt-6 text-sm text-gray-500">
          Changed your mind?{" "}
          <Link href={unsubscribe_url} className="text-blue-600 underline">
            Unsubscribe
          </Link>
          .
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const newsletterWelcomeEmail = (props: NewsletterWelcomeEmailProps) => (
  <NewsletterWelcomeEmailComponent {...props} />
);

export default () => (
  <NewsletterWelcomeEmailComponent unsubscribe_url="https://example.com/newsletter/unsubscribe?token=abc123" />
);
