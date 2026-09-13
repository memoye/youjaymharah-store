import { Column, Heading, Row, Text } from "react-email";

import { EmailLayout } from "./layout";

/** One line in an item list. Typed structurally; steps map order items onto it. */
export type EmailLineItem = {
  title?: string | null;
  variant_title?: string | null;
  quantity?: number | null;
  /** A short extra line under the title, e.g. a claim reason. */
  note?: string | null;
};

type ItemListProps = {
  heading: string;
  items?: EmailLineItem[] | null;
};

/** A headed list of items with quantities. Renders nothing for an empty list. */
export function ItemList({ heading, items }: ItemListProps) {
  if (!items?.length) {
    return null;
  }

  return (
    <>
      <Heading className="text-xl font-semibold text-gray-800 mb-4 mt-6">
        {heading}
      </Heading>
      {items.map((item, index) => (
        <Row
          key={`${item.title}-${index}`}
          className="border-b border-gray-200 py-3"
        >
          <Column className="w-3/4">
            <Text className="m-0 text-gray-800">{item.title}</Text>
            {item.variant_title && (
              <Text className="m-0 text-sm text-gray-500">
                {item.variant_title}
              </Text>
            )}
            {item.note && (
              <Text className="m-0 text-sm text-gray-500">{item.note}</Text>
            )}
          </Column>
          <Column className="w-1/4 text-right">
            <Text className="m-0 text-gray-600">x{item.quantity ?? 1}</Text>
          </Column>
        </Row>
      ))}
    </>
  );
}

export default function ItemListPreview() {
  return (
    <EmailLayout preview="Item list preview" heading="Item list">
      <ItemList
        heading="Your items"
        items={[
          {
            title: "Relaxed Linen Shirt",
            variant_title: "White / M",
            quantity: 1,
          },
          {
            title: "Wide-Leg Trousers",
            quantity: 2,
            note: "Reason: Wrong size",
          },
        ]}
      />
    </EmailLayout>
  );
}
