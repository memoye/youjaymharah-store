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
      <Text className="text-gray-600 mt-6">
        We will be in touch with how to send the items back.
      </Text>
    );
  }

  return (
    <Section className="rounded-lg bg-gray-50 p-4 my-6">
      <Heading className="text-base font-semibold text-gray-800 m-0">
        Where to send it
      </Heading>
      {destination?.name && (
        <Text className="text-gray-800 m-0 mt-2">{destination.name}</Text>
      )}
      {lines.map((line) => (
        <Text key={line} className="text-gray-600 m-0">
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
