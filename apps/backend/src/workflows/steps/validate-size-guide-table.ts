import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import type { SizeGuideTable } from "../../modules/size-guide/types";
import { describeTableProblems, SIZE_OPTION_TITLE } from "../utils/size-guide";

export type ValidateSizeGuideTableInput = { table?: SizeGuideTable | null };

/**
 * Checks a guide's table before it is saved: its own consistency, and that
 * every row's size is a real value of the shared Size option, so a typo like
 * "Meduim" is caught here rather than never matching a variant on the site.
 * An update that does not touch the table passes straight through.
 */
export const validateSizeGuideTableStep = createStep(
  "validate-size-guide-table",
  async (input: ValidateSizeGuideTableInput, { container }) => {
    if (!input.table) {
      return new StepResponse(true);
    }

    const problems = describeTableProblems(input.table);

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [option],
    } = await query.graph({
      entity: "product_option",
      fields: ["id", "values.value"],
      filters: { title: SIZE_OPTION_TITLE, is_exclusive: false },
    });

    // No shared Size option yet (a fresh store): nothing to check against.
    if (option) {
      const known = new Set<string>(
        (option.values ?? []).map((value) => String(value?.value)),
      );

      const unknown = [
        ...new Set(
          input.table.rows
            .map((row) => row.size)
            .filter((size) => !known.has(size)),
        ),
      ];

      if (unknown.length) {
        problems.push(
          `${unknown.join(", ")} ${unknown.length === 1 ? "is not a size" : "are not sizes"} in the shared ${SIZE_OPTION_TITLE} option. Check the spelling, or add ${unknown.length === 1 ? "it" : "them"} under Products › Options first.`,
        );
      }
    }

    if (problems.length) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, problems.join(" "));
    }

    return new StepResponse(true);
  },
);
