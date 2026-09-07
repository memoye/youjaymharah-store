import {
  Column,
  Container,
  Heading,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type {
  BigNumberValue,
  CustomerDTO,
  OrderDTO,
} from "@medusajs/framework/types";

import { EmailLayout } from "./components/layout";
import type { BrandSummary } from "./constants";
import { SUPPORT_EMAIL } from "./constants";

export type OrderCanceledEmailProps = {
  order: OrderDTO & { customer?: CustomerDTO };
  /** Optional merchant-supplied reason, shown verbatim when present. */
  reason?: string;
  /** Live store branding, supplied by the sending subscriber. */
  brand?: BrandSummary;
};

function OrderCanceledEmailComponent({
  order,
  reason,
  brand,
}: OrderCanceledEmailProps) {
  const recipient =
    order.customer?.first_name ?? order.shipping_address?.first_name ?? "there";

  const formatter = new Intl.NumberFormat([], {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: order.currency_code,
  });

  const formatPrice = (price: BigNumberValue) => {
    if (typeof price === "number") {
      return formatter.format(price);
    }

    if (typeof price === "string") {
      return formatter.format(parseFloat(price));
    }

    return price?.toString() || "";
  };

  return (
    <EmailLayout
      brand={brand}
      preview={`Order #${order.display_id} was canceled`}
      heading={`Your order was canceled, ${recipient}`}
      intro={`Order #${order.display_id} has been canceled and will not ship.`}
    >
      <Container className="px-6">
        {reason && (
          <Section className="rounded-lg bg-gray-50 p-4 mb-6">
            <Text className="m-0 text-gray-600">{reason}</Text>
          </Section>
        )}

        <Heading className="text-xl font-semibold text-gray-800 mb-4">
          Canceled items
        </Heading>
        {order.items?.map((item) => (
          <Row key={item.id} className="border-b border-gray-200 py-3">
            <Column className="w-3/4">
              <Text className="m-0 text-gray-800">{item.product_title}</Text>
              <Text className="m-0 text-sm text-gray-500">
                {item.variant_title}
              </Text>
            </Column>
            <Column className="w-1/4 text-right">
              <Text className="m-0 text-gray-600">
                {formatPrice(item.total)}
              </Text>
            </Column>
          </Row>
        ))}

        <Row className="mt-4 text-gray-800 font-bold">
          <Column className="w-1/2">
            <Text>Order total</Text>
          </Column>
          <Column className="w-1/2 text-right">
            <Text>{formatPrice(order.total)}</Text>
          </Column>
        </Row>

        <Text className="text-gray-600 mt-6">
          Any payment taken for this order is refunded to the original payment
          method. Refund timing depends on your bank. If anything looks wrong,
          reply to this email or write to {SUPPORT_EMAIL}.
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const orderCanceledEmail = (props: OrderCanceledEmailProps) => (
  <OrderCanceledEmailComponent {...props} />
);

const mockProps = {
  order: {
    id: "order_01JSNXDH9BPJWWKVW03B9E9KW8",
    display_id: 1,
    currency_code: "ngn",
    total: 25000,
    customer: { first_name: "Ada" },
    shipping_address: { first_name: "Ada" },
    items: [
      {
        id: "ordli_01JSNXDH9C47KZ43WQ3TBFXZA9",
        product_title: "Medusa Sweatshirt",
        variant_title: "L",
        total: 25000,
      },
    ],
  },
  reason: "Cancelled at your request.",
};

// @ts-ignore -- preview-only mock, not the full OrderDTO
export default () => <OrderCanceledEmailComponent {...mockProps} />;
