import {
  Button,
  Column,
  Container,
  Img,
  Link,
  Row,
  Section,
  Text,
} from "react-email";

import { EmailLayout } from "./components/layout";
import { STORE_NAME, type BrandSummary } from "./constants";

export type BagReminderItem = {
  title: string;
  variant_title?: string | null;
  quantity: number;
  thumbnail?: string | null;
  /** Already formatted, e.g. "₦45,000"; empty when unknown. */
  price?: string | null;
};

export type BagReminderEmailProps = {
  /** 1 for the first reminder. */
  reminder_number: number;
  total_reminders: number;
  items: BagReminderItem[];
  /** Opens the storefront with this bag restored. */
  bag_url: string;
  /** Stops bag reminders for this address. */
  stop_url: string;
  brand?: BrandSummary;
};

type Copy = { preview: string; heading: string; intro: string };

/** The wording for where this reminder falls: first, in between, or last. */
export function bagReminderCopy(
  reminderNumber: number,
  totalReminders: number,
  storeName: string,
): Copy & { subject: string } {
  if (reminderNumber <= 1) {
    return {
      subject: "You left something in your shopping bag",
      preview: "Your shopping bag is saved",
      heading: "You left something behind",
      intro: `Your shopping bag at ${storeName} is saved and ready when you are.`,
    };
  }

  if (reminderNumber >= totalReminders) {
    return {
      subject: "Last reminder: your shopping bag is waiting",
      preview: "Your shopping bag is still here",
      heading: "Your bag is still here",
      intro:
        "This is our last reminder about your shopping bag. We can't hold items, so sizes may sell out.",
    };
  }

  return {
    subject: "Still thinking it over?",
    preview: "The pieces in your shopping bag are waiting",
    heading: "Still thinking it over?",
    intro: "The pieces in your shopping bag are still waiting for you.",
  };
}

function BagReminderEmailComponent({
  reminder_number,
  total_reminders,
  items,
  bag_url,
  stop_url,
  brand,
}: BagReminderEmailProps) {
  const storeName = brand?.name || STORE_NAME;
  const copy = bagReminderCopy(reminder_number, total_reminders, storeName);

  return (
    <EmailLayout
      brand={brand}
      preview={copy.preview}
      heading={copy.heading}
      intro={copy.intro}
    >
      <Container className="px-6">
        {items.map((item, index) => (
          <Row
            key={`${item.title}-${index}`}
            className="border-b border-gray-200 py-3"
          >
            <Column className="w-20 align-top">
              {item.thumbnail ? (
                <Img
                  src={item.thumbnail}
                  alt={item.title}
                  width="64"
                  className="h-auto w-16 rounded"
                />
              ) : null}
            </Column>
            <Column className="align-top">
              <Text className="m-0 text-gray-800">{item.title}</Text>
              {item.variant_title && (
                <Text className="m-0 text-sm text-gray-500">
                  {item.variant_title}
                </Text>
              )}
              <Text className="m-0 text-sm text-gray-500">
                Qty {item.quantity}
              </Text>
            </Column>
            <Column className="w-1/4 text-right align-top">
              {item.price && (
                <Text className="m-0 text-gray-800">{item.price}</Text>
              )}
            </Column>
          </Row>
        ))}
        <Section className="my-6 text-center">
          <Button
            href={bag_url}
            className="rounded-lg bg-[#27272a] px-6 py-3 font-semibold text-white"
          >
            View your bag
          </Button>
        </Section>
        <Text className="text-sm text-gray-600">
          Prices and availability can change until you check out.
        </Text>
        <Text className="mt-6 text-sm text-gray-500">
          You're getting this because you added items to your shopping bag at{" "}
          {storeName} using this email address.{" "}
          <Link href={stop_url} className="text-gray-500 underline">
            Stop bag reminders
          </Link>
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const bagReminderEmail = (props: BagReminderEmailProps) => (
  <BagReminderEmailComponent {...props} />
);

export default function BagReminderEmailPreview() {
  return (
    <BagReminderEmailComponent
      reminder_number={1}
      total_reminders={3}
      items={[
        {
          title: "Pleated Midi Shirt Dress",
          variant_title: "Sage / M",
          quantity: 1,
          price: "₦45,000",
        },
        {
          title: "Leather Tote",
          quantity: 1,
          price: "₦62,500",
        },
      ]}
      bag_url="https://example.com/shopping-bag/restore?token=example"
      stop_url="https://example.com/shopping-bag/reminders/stop?token=example"
    />
  );
}
