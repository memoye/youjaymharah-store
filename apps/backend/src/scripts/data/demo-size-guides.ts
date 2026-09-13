import type { SizeGuideTable } from "../../modules/size-guide/types";

/**
 * Demo size guides, matched to the demo catalogue's sizes. Measurements are
 * body measurements in cm; ranges are [min, max]. Placeholder figures for
 * development only -- the store's real charts come from the client.
 */
export type DemoSizeGuide = {
  name: string;
  description: string;
  /** Category handles that use this guide as their default. */
  categories: string[];
  table: SizeGuideTable;
};

const HOW_TO_MEASURE =
  "Measure over underwear with a soft tape, keeping it level and snug but not tight. Bust: around the fullest part. Waist: around the narrowest part. Hips: around the fullest part, feet together. Between two sizes, choose the larger for a relaxed fit.";

export const DEMO_SIZE_GUIDES: DemoSizeGuide[] = [
  {
    name: "Women's clothing",
    description: HOW_TO_MEASURE,
    categories: [
      "women-dresses",
      "women-knitwear",
      "women-coats-jackets",
      "women-tailoring",
      "women-shirts-blouses",
      "women-tops",
      "women-skirts",
    ],
    table: {
      columns: [
        { key: "bust", label: "Bust", type: "measurement" },
        { key: "waist", label: "Waist", type: "measurement" },
        { key: "hips", label: "Hips", type: "measurement" },
        { key: "uk", label: "UK size", type: "text" },
      ],
      rows: [
        {
          size: "XS",
          values: { bust: [80, 84], waist: [62, 66], hips: [88, 92], uk: "6" },
        },
        {
          size: "S",
          values: { bust: [84, 88], waist: [66, 70], hips: [92, 96], uk: "8" },
        },
        {
          size: "M",
          values: {
            bust: [88, 92],
            waist: [70, 74],
            hips: [96, 100],
            uk: "10",
          },
        },
        {
          size: "L",
          values: {
            bust: [93, 98],
            waist: [75, 80],
            hips: [101, 106],
            uk: "12",
          },
        },
        {
          size: "XL",
          values: {
            bust: [99, 104],
            waist: [81, 86],
            hips: [107, 112],
            uk: "14",
          },
        },
      ],
    },
  },
  {
    name: "Trousers",
    description: `${HOW_TO_MEASURE} Inside leg: from the crotch to the floor, without shoes.`,
    categories: ["women-trousers"],
    table: {
      columns: [
        { key: "waist", label: "Waist", type: "measurement" },
        { key: "hips", label: "Hips", type: "measurement" },
        { key: "inside_leg", label: "Inside leg", type: "measurement" },
      ],
      rows: [
        {
          size: "32",
          values: { waist: [62, 65], hips: [88, 91], inside_leg: 78 },
        },
        {
          size: "34",
          values: { waist: [66, 69], hips: [92, 95], inside_leg: 79 },
        },
        {
          size: "36",
          values: { waist: [70, 73], hips: [96, 99], inside_leg: 80 },
        },
        {
          size: "38",
          values: { waist: [74, 77], hips: [100, 103], inside_leg: 81 },
        },
        {
          size: "40",
          values: { waist: [78, 81], hips: [104, 107], inside_leg: 82 },
        },
        {
          size: "42",
          values: { waist: [82, 86], hips: [108, 112], inside_leg: 82 },
        },
      ],
    },
  },
  {
    name: "Jeans",
    description:
      "Jeans are sized by waist in inches. Measure your waist where the jeans will sit, and your hips around the fullest part.",
    categories: ["women-jeans"],
    table: {
      columns: [
        { key: "waist", label: "Waist", type: "measurement" },
        { key: "hips", label: "Hips", type: "measurement" },
      ],
      rows: [
        { size: "24", values: { waist: [61, 63], hips: [86, 88] } },
        { size: "25", values: { waist: [64, 66], hips: [89, 91] } },
        { size: "26", values: { waist: [66, 68], hips: [91, 93] } },
        { size: "27", values: { waist: [69, 71], hips: [94, 96] } },
        { size: "28", values: { waist: [71, 73], hips: [96, 98] } },
        { size: "29", values: { waist: [74, 76], hips: [99, 101] } },
        { size: "30", values: { waist: [76, 78], hips: [101, 103] } },
      ],
    },
  },
  {
    name: "Shoes",
    description:
      "Stand on a sheet of paper, mark your heel and longest toe, and measure the distance between them. Between sizes, choose the larger.",
    categories: ["women-shoes"],
    table: {
      columns: [
        { key: "foot_length", label: "Foot length", type: "measurement" },
        { key: "uk", label: "UK", type: "text" },
        { key: "us", label: "US", type: "text" },
      ],
      rows: [
        { size: "36", values: { foot_length: 23, uk: "3", us: "5" } },
        { size: "37", values: { foot_length: 23.7, uk: "4", us: "6" } },
        { size: "38", values: { foot_length: 24.3, uk: "5", us: "7" } },
        { size: "39", values: { foot_length: 25, uk: "6", us: "8" } },
        { size: "40", values: { foot_length: 25.7, uk: "7", us: "9" } },
        { size: "41", values: { foot_length: 26.3, uk: "8", us: "10" } },
      ],
    },
  },
];
