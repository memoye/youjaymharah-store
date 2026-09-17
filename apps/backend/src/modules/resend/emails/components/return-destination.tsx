import { Heading, Section, Text } from "react-email";

import { EmailLayout } from "./layout";

/** Where returned items go. The sending step builds it from the stock location. */
export type ReturnDestination = {
  name?: string | null;
  address_lines?: string[];
};

type ReturnDestinationSectionProps = {
  destination?: ReturnDestination | null;
};

/**
 * "Where to send it", or a holding line when the return has neither a location
 * name nor any address -- a location saved with only a city is still shown.
 */
export function ReturnDestinationSection({
  destination,
}: ReturnDestinationSectionProps) {
  const lines = destination?.address_lines?.filter(Boolean) ?? [];

  if (!destination?.name && lines.length === 0) {
    return (
      <Text className="mt-6 text-gray-600">
        We will be in touch with how to send the items back.
      </Text>
    );
  }

  return (
    <Section className="my-6 rounded-lg bg-gray-50 p-4">
      <Heading className="m-0 text-base font-semibold text-gray-800">
        Where to send it
      </Heading>
      {destination?.name && (
        <Text className="m-0 mt-2 text-gray-800">{destination.name}</Text>
      )}
      {lines.map((line) => (
        <Text key={line} className="m-0 text-gray-600">
          {line}
        </Text>
      ))}
    </Section>
  );
}

export default function ReturnDestinationPreview() {
  return (
    <EmailLayout
      preview="Return destination preview"
      heading="Return destination"
    >
      <ReturnDestinationSection
        destination={{
          name: "Lagos Warehouse",
          address_lines: ["12 Admiralty Way", "Lekki, Lagos", "NG"],
        }}
      />
    </EmailLayout>
  );
}
