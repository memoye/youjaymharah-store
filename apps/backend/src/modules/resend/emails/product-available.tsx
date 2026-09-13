import { Button, Container, Img, Section, Text } from "react-email";
import { EmailLayout } from "./components/layout";
import type { BrandSummary } from "./constants";

export type ProductAvailableEmailProps = {
  /** "restock": a sold-out item is back. "launch": a coming-soon item is out. */
  reason: "restock" | "launch";
  product: {
    title: string;
    url: string;
    thumbnail?: string | null;
  };
  /** The size/colour they asked about, when they picked one. */
  variant_title?: string | null;
  brand?: BrandSummary;
};

function ProductAvailableEmailComponent({
  reason,
  product,
  variant_title,
  brand,
}: ProductAvailableEmailProps) {
  const launched = reason === "launch";
  const name = variant_title
    ? `${product.title} in ${variant_title}`
    : product.title;

  return (
    <EmailLayout
      brand={brand}
      preview={
        launched
          ? `${product.title} is now available`
          : `${product.title} is back in stock`
      }
      heading={launched ? "It's here" : "Back in stock"}
      intro={
        launched
          ? `${name} is now available to order.`
          : `${name} is available again.`
      }
    >
      <Container className="px-6">
        {product.thumbnail && (
          <Section className="my-4 text-center">
            <Img
              src={product.thumbnail}
              alt={product.title}
              width="240"
              className="mx-auto h-auto w-60 rounded-lg"
            />
          </Section>
        )}
        <Section className="my-6 text-center">
          <Button
            href={product.url}
            className="rounded-lg bg-[#27272a] px-6 py-3 font-semibold text-white"
          >
            Shop now
          </Button>
        </Section>
        <Text className="text-gray-600">
          We can't hold items for you, so it may sell out again.
        </Text>
        <Text className="mt-6 text-sm text-gray-500">
          You're getting this one-off email because this address asked to hear
          when this item became available. We won't email you about it again.
        </Text>
      </Container>
    </EmailLayout>
  );
}

export const productAvailableEmail = (props: ProductAvailableEmailProps) => (
  <ProductAvailableEmailComponent {...props} />
);

export default function ProductAvailableEmailPreview() {
  return (
    <ProductAvailableEmailComponent
      reason="restock"
      product={{
        title: "Pleated Midi Shirt Dress",
        url: "https://example.com/products/pleated-midi-shirt-dress",
      }}
      variant_title="M / Sage"
    />
  );
}
