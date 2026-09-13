import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import {
  COMING_SOON_METADATA_KEY,
  isComingSoon,
  LAUNCHED_AT_METADATA_KEY,
} from "../utils/product-availability";

export type PrepareComingSoonMetadataInput = {
  product_id: string;
  coming_soon: boolean;
};

export type PrepareComingSoonMetadataOutput = {
  metadata: Record<string, unknown>;
  launched_at: string | null;
};

/**
 * Builds the product's next metadata: every existing key kept, `coming_soon`
 * set, and `launched_at` stamped when this change is the launch (coming soon
 * switched from on to off).
 *
 * The launch time is taken here, in a step, rather than in a workflow
 * `transform`: a transform runs again for each place its result is used, so
 * the update and the response would each get their own `new Date()`. A step's
 * output is recorded once and every later use reads the same value.
 */
export const prepareComingSoonMetadataStep = createStep(
  "prepare-coming-soon-metadata",
  async (input: PrepareComingSoonMetadataInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [product],
    } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
      filters: { id: input.product_id },
    });

    if (!product) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product ${input.product_id} was not found.`,
      );
    }

    const current = (product.metadata as Record<string, unknown> | null) ?? {};
    const launching = isComingSoon(current) && !input.coming_soon;

    const metadata: Record<string, unknown> = {
      ...current,
      [COMING_SOON_METADATA_KEY]: input.coming_soon,
      ...(launching
        ? { [LAUNCHED_AT_METADATA_KEY]: new Date().toISOString() }
        : {}),
    };

    const launchedAt = metadata[LAUNCHED_AT_METADATA_KEY];

    return new StepResponse<PrepareComingSoonMetadataOutput>({
      metadata,
      launched_at: typeof launchedAt === "string" ? launchedAt : null,
    });
  },
);
