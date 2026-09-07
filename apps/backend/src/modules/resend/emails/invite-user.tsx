import { Button, Container, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import type { BrandSummary } from "./constants";
import { STORE_NAME } from "./constants";

export type InviteUserEmailProps = {
  /** Admin invite acceptance link, built by the subscriber from the token. */
  url: string;
  email?: string;
  /** Who sent the invite, when known. */
  invited_by?: string;
  /** Live store branding, supplied by the sending subscriber. */
  brand?: BrandSummary;
};

function InviteUserEmailComponent({
  url,
  email,
  invited_by,
  brand,
}: InviteUserEmailProps) {
  return (
    <EmailLayout
      brand={brand}
      preview={`You have been invited to ${STORE_NAME}`}
      heading={`Join the ${STORE_NAME} team`}
      intro={
        invited_by
          ? `${invited_by} invited you to the ${STORE_NAME} admin dashboard.`
          : `You have been invited to the ${STORE_NAME} admin dashboard.`
      }
    >
      <Container className="px-6">
        <Section className="text-center my-6">
          <Button
            href={url}
            className="bg-[#27272a] text-white rounded-lg px-6 py-3 font-semibold"
          >
            Accept invitation
          </Button>
        </Section>

        {email && (
          <Text className="text-gray-600">
            This invitation was sent to {email}. Accept it with that address.
          </Text>
        )}

        <Text className="text-gray-600">
          If the button does not work, paste this address into your browser:
        </Text>
        <Text className="text-sm text-blue-600 break-all">{url}</Text>

        <Text className="text-gray-600 mt-6">
          Invitations expire. If yours has lapsed, ask an administrator to send
          a new one.
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const inviteUserEmail = (props: InviteUserEmailProps) => (
  <InviteUserEmailComponent {...props} />
);

export default () => (
  <InviteUserEmailComponent
    url="https://example.com/app/invite?token=abc123"
    email="ada@example.com"
    invited_by="Memoye"
  />
);
