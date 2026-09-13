import { model } from "@medusajs/framework/utils";

/**
 * A reusable size chart, assigned to categories (their default) and to
 * individual products (an override). See `SizeGuideTable` for the shape of
 * `table`.
 */
export const SizeGuide = model
  .define("size_guide", {
    id: model.id({ prefix: "szg" }).primaryKey(),
    name: model.text(),
    /**
     * "body": body measurements per size, shared across many products.
     * "garment": one product's own measurements (length, sleeve). Only body
     * guides can be created from the admin for now.
     */
    kind: model.enum(["body", "garment"]).default("body"),
    /** "How to measure" notes shown above the table. */
    description: model.text().nullable(),
    /** Optional measuring diagram, uploaded to the file storage. */
    diagram_url: model.text().nullable(),
    /** `{ columns, rows }`, measurements in cm. */
    table: model.json(),
    /** Used for products whose categories have no guide. At most one. */
    is_default: model.boolean().default(false),
  })
  .indexes([
    {
      on: ["is_default"],
      unique: true,
      where: "is_default = true AND deleted_at IS NULL",
    },
  ]);
