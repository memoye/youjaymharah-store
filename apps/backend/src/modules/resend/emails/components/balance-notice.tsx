import { Section, Text } from "react-email";

import { describeOrderBalance } from "../../utils/order-balance";
import { EmailLayout } from "./layout";

type BalanceNoticeProps = {
  /** The order summary's `pending_difference` after the change. */
  pendingDifference?: number | null;
  currencyCode: string;
};

/**
 * What an order change leaves outstanding. Renders nothing when the order is
 * settled, so a template can include it unconditionally.
 */
export function BalanceNotice({
  pendingDifference,
  currencyCode,
}: BalanceNoticeProps) {
  const balance = describeOrderBalance(pendingDifference, currencyCode);

  if (balance.direction === "settled") {
    return null;
  }

  return (
    <Section className="my-6 rounded-lg bg-gray-50 p-4">
      {balance.direction === "customer_owes" ? (
        <Text className="m-0 text-gray-800">
          There is <strong>{balance.amount}</strong> left to pay on this order.
          We will be in touch with how to pay it.
        </Text>
      ) : (
        <Text className="m-0 text-gray-800">
          We will refund <strong>{balance.amount}</strong> to your original
          payment method.
        </Text>
      )}
    </Section>
  );
}

export default function BalanceNoticePreview() {
  return (
    <EmailLayout preview="Balance notice preview" heading="Balance notice">
      <BalanceNotice pendingDifference={-5000} currencyCode="ngn" />
      <BalanceNotice pendingDifference={7500} currencyCode="ngn" />
    </EmailLayout>
  );
}
