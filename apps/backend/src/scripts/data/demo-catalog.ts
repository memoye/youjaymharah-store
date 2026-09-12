/**
 * Demo womenswear catalog modelled on a minimalist, COS-style assortment:
 * a "Women" root category with garment categories beneath it, seasonal and
 * evergreen collections ("edits"), and products carrying the detail a PDP
 * needs (composition, fit, care, colour swatches).
 *
 * Consumed by ../seed-demo-catalog.ts. Images are hotlinked from Unsplash so
 * the catalog works without the file module being configured.
 */

export type DemoCategory = {
  name: string;
  handle: string;
  description: string;
  parent?: string;
};

export type DemoCollection = {
  title: string;
  handle: string;
  description: string;
  heroImage: string;
};

export type DemoColour = {
  name: string;
  hex: string;
};

export type DemoProduct = {
  title: string;
  handle: string;
  skuPrefix: string;
  description: string;
  category: string;
  collection?: string;
  type: string;
  tags?: string[];
  priceUsd: number;
  colours: DemoColour[];
  sizes: string[];
  material: string;
  fit: string;
  care: string;
  images: string[];
  /** Every variant is created with zero stock, to exercise sold-out UI. */
  soldOut?: boolean;
};

export type DemoPriceList = {
  title: string;
  description: string;
  discountPercent: number;
  productHandles: string[];
};

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&h=1600&q=80`;

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"];
const TROUSER_SIZES = ["32", "34", "36", "38", "40", "42"];
const DENIM_SIZES = ["24", "25", "26", "27", "28", "29", "30"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41"];
const ONE_SIZE = ["One Size"];

const CARE_WOOL =
  "Hand wash cold or dry clean. Dry flat. Do not tumble dry. Cool iron.";
const CARE_COTTON =
  "Machine wash at 30C. Do not tumble dry. Medium iron. Wash with similar colours.";
const CARE_LINEN =
  "Machine wash at 30C on a gentle cycle. Line dry. Iron while slightly damp.";
const CARE_SILK = "Dry clean only. Cool iron on the reverse.";
const CARE_SYNTHETIC =
  "Machine wash at 30C on a delicate cycle. Do not tumble dry. Cool iron.";
const CARE_DENIM =
  "Machine wash at 30C inside out. Wash with similar colours. Line dry.";
const CARE_LEATHER =
  "Wipe clean with a soft, dry cloth. Store in the dust bag provided, away from direct sunlight.";
const CARE_JEWELLERY =
  "Avoid contact with water, perfume and lotions. Store separately in the pouch provided.";

const BLACK = { name: "Black", hex: "#1c1c1c" };
const NAVY = { name: "Navy", hex: "#1f2a44" };
const WHITE = { name: "White", hex: "#f7f7f5" };
const ECRU = { name: "Ecru", hex: "#ece4d4" };
const CREAM = { name: "Cream", hex: "#f1e9da" };
const CAMEL = { name: "Camel", hex: "#b08a5e" };
const BROWN = { name: "Brown", hex: "#6b4a33" };
const CHOCOLATE = { name: "Chocolate", hex: "#3e2a20" };
const GREY = { name: "Grey Melange", hex: "#9a9a98" };
const BEIGE = { name: "Beige", hex: "#d6c3a5" };
const STONE = { name: "Stone", hex: "#c9bfae" };
const SAND = { name: "Sand", hex: "#dccbb0" };
const IVORY = { name: "Ivory", hex: "#f4efe3" };
const PALE_BLUE = { name: "Pale Blue", hex: "#c7d6e6" };
const MID_BLUE = { name: "Mid Blue", hex: "#5b7898" };
const LIGHT_BLUE = { name: "Light Blue", hex: "#9db4cc" };
const WASHED_BLACK = { name: "Washed Black", hex: "#3a3a3a" };
const OCHRE = { name: "Ochre", hex: "#c8962e" };
const TERRACOTTA = { name: "Terracotta", hex: "#b5613f" };
const RED = { name: "Red", hex: "#9e2b25" };
const TAN = { name: "Tan", hex: "#a8764a" };
const GOLD = { name: "Gold", hex: "#c9a96e" };
const SILVER = { name: "Silver", hex: "#c0c0c0" };
const CHAMPAGNE = { name: "Champagne", hex: "#e6d3b3" };

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    name: "Women",
    handle: "women",
    description:
      "Modern, timeless and functional womenswear designed to be worn and loved for years.",
  },
  {
    name: "Dresses",
    handle: "women-dresses",
    parent: "women",
    description: "Slip, shirt and knitted dresses in considered silhouettes.",
  },
  {
    name: "Knitwear",
    handle: "women-knitwear",
    parent: "women",
    description: "Merino, cashmere and wool-blend knits for every season.",
  },
  {
    name: "Coats & Jackets",
    handle: "women-coats-jackets",
    parent: "women",
    description: "Tailored wool coats, trenches and relaxed jackets.",
  },
  {
    name: "Suits & Tailoring",
    handle: "women-tailoring",
    parent: "women",
    description: "Sharp blazers and suiting with a relaxed sensibility.",
  },
  {
    name: "Shirts & Blouses",
    handle: "women-shirts-blouses",
    parent: "women",
    description: "Crisp poplin, washed linen and fluid silk.",
  },
  {
    name: "T-Shirts & Tops",
    handle: "women-tops",
    parent: "women",
    description: "Wardrobe foundations in organic cotton jersey.",
  },
  {
    name: "Trousers",
    handle: "women-trousers",
    parent: "women",
    description: "Wide-leg, barrel and straight cuts in wool, twill and linen.",
  },
  {
    name: "Jeans",
    handle: "women-jeans",
    parent: "women",
    description: "Rigid organic cotton denim in straight and barrel shapes.",
  },
  {
    name: "Skirts",
    handle: "women-skirts",
    parent: "women",
    description: "Pleated, bias-cut and A-line midi skirts.",
  },
  {
    name: "Accessories",
    handle: "women-accessories",
    parent: "women",
    description: "Leather bags, shoes and jewellery to complete the look.",
  },
  {
    name: "Bags",
    handle: "women-bags",
    parent: "women-accessories",
    description: "Leather totes, crossbody and shoulder bags.",
  },
  {
    name: "Shoes",
    handle: "women-shoes",
    parent: "women-accessories",
    description: "Loafers, flats, heels and boots in smooth leather.",
  },
  {
    name: "Jewellery",
    handle: "women-jewellery",
    parent: "women-accessories",
    description: "Sculptural, gold-tone and sterling silver pieces.",
  },
];

export const DEMO_COLLECTIONS: DemoCollection[] = [
  {
    title: "Autumn Winter 2026",
    handle: "autumn-winter-2026",
    description:
      "Enveloping wool coats, textured knits and a palette of chocolate, camel and black.",
    heroImage: img("1618244972963-dbee1a7edc95"),
  },
  {
    title: "Wardrobe Essentials",
    handle: "wardrobe-essentials",
    description:
      "The pieces we return to season after season: the clean-cut tee, the poplin shirt, the wide-leg trouser.",
    heroImage: img("1627130697816-4d71dbfe6a5b"),
  },
  {
    title: "Atelier",
    handle: "atelier",
    description:
      "Our most elevated line, crafted from exceptional materials such as pure cashmere, double-faced wool and silk.",
    heroImage: img("1612731486606-2614b4d74921"),
  },
  {
    title: "The Linen Edit",
    handle: "the-linen-edit",
    description:
      "Breathable, European-grown linen in easy shapes for warm days.",
    heroImage: img("1625499706422-998dd9e31a66"),
  },
];

export const DEMO_TAGS = [
  "new-arrival",
  "bestseller",
  "sustainable-materials",
  "limited-edition",
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Dresses
  {
    title: "Pleated Midi Shirt Dress",
    handle: "pleated-midi-shirt-dress",
    skuPrefix: "DRS01",
    description:
      "A relaxed shirt dress with a fluid, pleated skirt that falls to mid-calf. Crafted from crisp organic cotton poplin with a concealed button placket and a removable self-tie belt.",
    category: "women-dresses",
    collection: "autumn-winter-2026",
    type: "Dress",
    tags: ["new-arrival", "sustainable-materials"],
    priceUsd: 175,
    colours: [BLACK, NAVY],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "Relaxed fit. The model is 177cm and wears a size S.",
    care: CARE_COTTON,
    images: [
      img("1645400118924-9ae0f2fe85ac"),
      img("1721103428250-896d83207659"),
    ],
  },
  {
    title: "Draped Satin Slip Dress",
    handle: "draped-satin-slip-dress",
    skuPrefix: "DRS02",
    description:
      "An asymmetric slip dress cut on the bias so the lustrous satin skims the body. Finished with delicate adjustable straps and a cowl neckline.",
    category: "women-dresses",
    collection: "atelier",
    type: "Dress",
    tags: ["new-arrival"],
    priceUsd: 190,
    colours: [IVORY, BLACK],
    sizes: APPAREL_SIZES,
    material: "100% recycled polyester",
    fit: "Regular fit, bias cut. The model is 178cm and wears a size XS.",
    care: CARE_SYNTHETIC,
    images: [
      img("1584287981937-67ab60932edf"),
      img("1601402346651-be7d0b7232d0"),
    ],
  },
  {
    title: "Wool-Blend Knitted Midi Dress",
    handle: "wool-blend-knitted-midi-dress",
    skuPrefix: "DRS03",
    description:
      "A column midi dress knitted from a soft wool blend in a fine rib. Long sleeves and a high crew neck make it an easy one-piece outfit for colder days.",
    category: "women-dresses",
    collection: "autumn-winter-2026",
    type: "Dress",
    priceUsd: 225,
    colours: [BROWN, BLACK],
    sizes: APPAREL_SIZES,
    material: "70% wool, 30% recycled polyamide",
    fit: "Slim fit. The model is 175cm and wears a size S.",
    care: CARE_WOOL,
    images: [
      img("1700748910236-3b744b8dacad"),
      img("1700748910920-81f4826ede95"),
    ],
  },
  {
    title: "Sleeveless A-Line Linen Dress",
    handle: "sleeveless-a-line-linen-dress",
    skuPrefix: "DRS04",
    description:
      "Cut from breathable pure linen, this sleeveless dress has a softly flared A-line skirt, deep side pockets and a round neckline.",
    category: "women-dresses",
    collection: "the-linen-edit",
    type: "Dress",
    tags: ["sustainable-materials"],
    priceUsd: 150,
    colours: [OCHRE, WHITE],
    sizes: APPAREL_SIZES,
    material: "100% linen",
    fit: "Relaxed fit. The model is 176cm and wears a size S.",
    care: CARE_LINEN,
    images: [
      img("1625499706422-998dd9e31a66"),
      img("1589565962511-1df0fb5471b2"),
    ],
  },
  {
    title: "Long-Sleeve Column Maxi Dress",
    handle: "long-sleeve-column-maxi-dress",
    skuPrefix: "DRS05",
    description:
      "A floor-grazing jersey dress with long sleeves and a clean boat neckline. Pared back and endlessly versatile.",
    category: "women-dresses",
    collection: "wardrobe-essentials",
    type: "Dress",
    tags: ["bestseller"],
    priceUsd: 135,
    colours: [BLACK],
    sizes: APPAREL_SIZES,
    material: "95% lyocell, 5% elastane",
    fit: "Slim fit. The model is 178cm and wears a size S.",
    care: CARE_SYNTHETIC,
    images: [
      img("1629922949137-e236a5ab497d"),
      img("1629922954496-c53253aeadfc"),
    ],
  },
  {
    title: "Tie-Waist Linen Jumpsuit",
    handle: "tie-waist-linen-jumpsuit",
    skuPrefix: "DRS06",
    description:
      "A utilitarian jumpsuit in washed linen with a self-tie waist, patch pockets and wide, cropped legs.",
    category: "women-dresses",
    collection: "the-linen-edit",
    type: "Jumpsuit",
    priceUsd: 165,
    colours: [OCHRE],
    sizes: APPAREL_SIZES,
    material: "100% linen",
    fit: "Relaxed fit. The model is 174cm and wears a size S.",
    care: CARE_LINEN,
    images: [img("1575633625496-e330445f63b2")],
  },
  {
    title: "Tiered Cotton Midi Dress",
    handle: "tiered-cotton-midi-dress",
    skuPrefix: "DRS07",
    description:
      "A voluminous tiered dress in lightweight cotton voile, with a gathered neckline and puffed sleeves.",
    category: "women-dresses",
    type: "Dress",
    priceUsd: 145,
    colours: [PALE_BLUE],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "Oversized fit. The model is 175cm and wears a size XS.",
    care: CARE_COTTON,
    images: [img("1585672275656-4433fc0668e7")],
  },

  // Knitwear
  {
    title: "Oversized Merino Wool Jumper",
    handle: "oversized-merino-wool-jumper",
    skuPrefix: "KNT01",
    description:
      "A boxy crew-neck jumper knitted from fine, responsibly sourced merino wool. Dropped shoulders and ribbed trims give it a relaxed, modern shape.",
    category: "women-knitwear",
    collection: "wardrobe-essentials",
    type: "Knitwear",
    tags: ["bestseller", "sustainable-materials"],
    priceUsd: 115,
    colours: [GREY, CREAM, BLACK],
    sizes: APPAREL_SIZES,
    material: "100% merino wool",
    fit: "Oversized fit. The model is 177cm and wears a size S.",
    care: CARE_WOOL,
    images: [
      img("1574201635302-388dd92a4c3f"),
      img("1602706294170-1fed8eecd9f9"),
    ],
  },
  {
    title: "Chunky Cable-Knit Wool Cardigan",
    handle: "chunky-cable-knit-wool-cardigan",
    skuPrefix: "KNT02",
    description:
      "A substantial cardigan with a bold cable pattern, horn-effect buttons and generous patch pockets.",
    category: "women-knitwear",
    collection: "autumn-winter-2026",
    type: "Knitwear",
    tags: ["new-arrival"],
    priceUsd: 175,
    colours: [BROWN, ECRU],
    sizes: APPAREL_SIZES,
    material: "80% wool, 20% recycled polyamide",
    fit: "Relaxed fit. The model is 176cm and wears a size S.",
    care: CARE_WOOL,
    images: [
      img("1612636676503-77f496c96ef8"),
      img("1641642231157-0849081598a2"),
    ],
  },
  {
    title: "Pure Cashmere Crew-Neck Jumper",
    handle: "pure-cashmere-crew-neck-jumper",
    skuPrefix: "KNT03",
    description:
      "Knitted from Grade A Mongolian cashmere for exceptional softness. A timeless crew-neck design with fully fashioned shoulders.",
    category: "women-knitwear",
    collection: "atelier",
    type: "Knitwear",
    tags: ["limited-edition"],
    priceUsd: 250,
    colours: [CAMEL, CREAM, NAVY],
    sizes: APPAREL_SIZES,
    material: "100% cashmere",
    fit: "Regular fit. The model is 178cm and wears a size S.",
    care: CARE_WOOL,
    images: [img("1760552069049-600f71fa5bbf"), img("1542648870-438579cbd0ba")],
  },
  {
    title: "Ribbed Wool Roll-Neck Jumper",
    handle: "ribbed-wool-roll-neck-jumper",
    skuPrefix: "KNT04",
    description:
      "A close-fitting roll-neck in a deep rib knit. Designed to layer under tailoring or wear alone with wide-leg trousers.",
    category: "women-knitwear",
    collection: "autumn-winter-2026",
    type: "Knitwear",
    priceUsd: 125,
    colours: [RED, BLACK],
    sizes: APPAREL_SIZES,
    material: "100% wool",
    fit: "Slim fit. The model is 175cm and wears a size S.",
    care: CARE_WOOL,
    images: [img("1634499913011-86108564b787")],
  },
  {
    title: "Relaxed Cotton-Linen Knitted Top",
    handle: "relaxed-cotton-linen-knitted-top",
    skuPrefix: "KNT05",
    description:
      "A lightweight knitted top in an airy cotton-linen blend with a wide neckline and short sleeves.",
    category: "women-knitwear",
    collection: "the-linen-edit",
    type: "Knitwear",
    priceUsd: 89,
    colours: [NAVY],
    sizes: APPAREL_SIZES,
    material: "55% linen, 45% organic cotton",
    fit: "Relaxed fit. The model is 177cm and wears a size S.",
    care: CARE_WOOL,
    images: [img("1732708873078-ed3c181a435c")],
  },

  // Coats & Jackets
  {
    title: "Double-Faced Wool Coat",
    handle: "double-faced-wool-coat",
    skuPrefix: "OUT01",
    description:
      "Hand-finished from double-faced wool, this unlined coat has clean raw-cut seams, a notch lapel and a long, straight silhouette.",
    category: "women-coats-jackets",
    collection: "atelier",
    type: "Coat",
    tags: ["new-arrival", "limited-edition"],
    priceUsd: 390,
    colours: [CAMEL, CHOCOLATE],
    sizes: APPAREL_SIZES,
    material: "90% wool, 10% cashmere",
    fit: "Relaxed fit. The model is 177cm and wears a size S.",
    care: CARE_WOOL,
    images: [
      img("1618244972963-dbee1a7edc95"),
      img("1618244965061-1d27b208d6e8"),
      img("1618333452884-5c8d211ed2ad"),
    ],
  },
  {
    title: "Oversized Wool-Blend Tailored Coat",
    handle: "oversized-wool-blend-tailored-coat",
    skuPrefix: "OUT02",
    description:
      "A single-breasted coat with exaggerated shoulders, deep flap pockets and a back vent. Fully lined for warmth.",
    category: "women-coats-jackets",
    collection: "autumn-winter-2026",
    type: "Coat",
    tags: ["bestseller"],
    priceUsd: 290,
    colours: [BLACK, GREY],
    sizes: APPAREL_SIZES,
    material: "60% wool, 40% recycled polyester",
    fit: "Oversized fit. The model is 178cm and wears a size S.",
    care: CARE_WOOL,
    images: [
      img("1596451984287-7a274406cbca"),
      img("1629922954217-c16e5bd22883"),
    ],
  },
  {
    title: "Water-Repellent Trench Coat",
    handle: "water-repellent-trench-coat",
    skuPrefix: "OUT03",
    description:
      "Our take on the classic trench: double-breasted, storm-flapped and belted, in a water-repellent cotton gabardine.",
    category: "women-coats-jackets",
    collection: "wardrobe-essentials",
    type: "Coat",
    tags: ["bestseller"],
    priceUsd: 250,
    colours: [BEIGE],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "Regular fit. The model is 176cm and wears a size S.",
    care: CARE_COTTON,
    images: [
      img("1700748911489-0552c576f274"),
      img("1653875842174-429c1b467548"),
    ],
  },
  {
    title: "Relaxed Denim Chore Jacket",
    handle: "relaxed-denim-chore-jacket",
    skuPrefix: "OUT04",
    description:
      "A boxy workwear-inspired jacket in rigid organic cotton denim, with three patch pockets and a point collar.",
    category: "women-coats-jackets",
    type: "Jacket",
    tags: ["sustainable-materials"],
    priceUsd: 150,
    colours: [MID_BLUE],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton denim",
    fit: "Relaxed fit. The model is 175cm and wears a size S.",
    care: CARE_DENIM,
    images: [img("1574413230698-f80892c96e13")],
  },
  {
    title: "Belted Wool Wrap Coat",
    handle: "belted-wool-wrap-coat",
    skuPrefix: "OUT05",
    description:
      "A collarless wrap coat with dropped shoulders and a self-tie belt. Sold out across all sizes, to exercise the storefront's sold-out state.",
    category: "women-coats-jackets",
    collection: "autumn-winter-2026",
    type: "Coat",
    priceUsd: 320,
    colours: [BROWN],
    sizes: APPAREL_SIZES,
    material: "80% wool, 20% polyamide",
    fit: "Relaxed fit. The model is 177cm and wears a size S.",
    care: CARE_WOOL,
    images: [img("1629922948950-08e61289569b")],
    soldOut: true,
  },

  // Suits & Tailoring
  {
    title: "Oversized Single-Breasted Wool Blazer",
    handle: "oversized-single-breasted-wool-blazer",
    skuPrefix: "TLR01",
    description:
      "A relaxed single-breasted blazer in a fine wool twill with padded shoulders and a single-button fastening. Pair with the matching wide-leg trousers.",
    category: "women-tailoring",
    collection: "wardrobe-essentials",
    type: "Blazer",
    tags: ["bestseller"],
    priceUsd: 225,
    colours: [BLACK, NAVY],
    sizes: APPAREL_SIZES,
    material: "100% wool",
    fit: "Oversized fit. The model is 177cm and wears a size S.",
    care: CARE_WOOL,
    images: [
      img("1612731486606-2614b4d74921"),
      img("1629922948950-08e61289569b"),
    ],
  },
  {
    title: "Double-Breasted Tailored Blazer",
    handle: "double-breasted-tailored-blazer",
    skuPrefix: "TLR02",
    description:
      "A sharp, double-breasted blazer with peak lapels and a slightly nipped waist, cut from a wool-blend suiting fabric.",
    category: "women-tailoring",
    collection: "autumn-winter-2026",
    type: "Blazer",
    tags: ["new-arrival"],
    priceUsd: 250,
    colours: [BROWN, BLACK],
    sizes: APPAREL_SIZES,
    material: "65% wool, 35% recycled polyester",
    fit: "Regular fit. The model is 178cm and wears a size S.",
    care: CARE_WOOL,
    images: [img("1788185881954-200704d64eb8")],
  },

  // Shirts & Blouses
  {
    title: "Oversized Organic Cotton Poplin Shirt",
    handle: "oversized-organic-cotton-poplin-shirt",
    skuPrefix: "SHT01",
    description:
      "A crisp, oversized shirt in organic cotton poplin with a curved hem, dropped shoulders and a concealed placket.",
    category: "women-shirts-blouses",
    collection: "wardrobe-essentials",
    type: "Shirt",
    tags: ["bestseller", "sustainable-materials"],
    priceUsd: 89,
    colours: [WHITE, PALE_BLUE, BLACK],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "Oversized fit. The model is 176cm and wears a size S.",
    care: CARE_COTTON,
    images: [
      img("1609369350331-4f12b446d487"),
      img("1609369350243-83d11c675ff8"),
    ],
  },
  {
    title: "Relaxed Linen Shirt",
    handle: "relaxed-linen-shirt",
    skuPrefix: "SHT02",
    description:
      "A lightweight shirt in garment-washed linen for a lived-in softness. Long sleeves with button cuffs and a chest pocket.",
    category: "women-shirts-blouses",
    collection: "the-linen-edit",
    type: "Shirt",
    tags: ["sustainable-materials"],
    priceUsd: 99,
    colours: [WHITE, SAND],
    sizes: APPAREL_SIZES,
    material: "100% linen",
    fit: "Relaxed fit. The model is 177cm and wears a size S.",
    care: CARE_LINEN,
    images: [
      img("1624000755940-98a2f79ad7de"),
      img("1627130697816-4d71dbfe6a5b"),
    ],
  },
  {
    title: "Silk Collarless Blouse",
    handle: "silk-collarless-blouse",
    skuPrefix: "SHT03",
    description:
      "A fluid blouse in heavyweight mulberry silk with a collarless neckline, covered buttons and softly gathered cuffs.",
    category: "women-shirts-blouses",
    collection: "atelier",
    type: "Blouse",
    tags: ["limited-edition"],
    priceUsd: 175,
    colours: [IVORY, BLACK],
    sizes: APPAREL_SIZES,
    material: "100% mulberry silk",
    fit: "Regular fit. The model is 178cm and wears a size XS.",
    care: CARE_SILK,
    images: [
      img("1636153279424-cb5d1e00f5a2"),
      img("1526413232644-8a40f03cc03b"),
    ],
  },

  // T-Shirts & Tops
  {
    title: "Clean-Cut T-Shirt",
    handle: "clean-cut-t-shirt",
    skuPrefix: "TOP01",
    description:
      "Our signature tee: a mid-weight organic cotton jersey with a neat crew neck and a straight, slightly boxy body.",
    category: "women-tops",
    collection: "wardrobe-essentials",
    type: "T-Shirt",
    tags: ["bestseller", "sustainable-materials"],
    priceUsd: 35,
    colours: [WHITE, BLACK, GREY, BROWN],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "Regular fit. The model is 176cm and wears a size S.",
    care: CARE_COTTON,
    images: [
      img("1627902778986-2e0d052f20d8"),
      img("1622057757383-f3af349525d5"),
      img("1624292001525-434c37ccecc0"),
    ],
  },
  {
    title: "Heavyweight Boxy T-Shirt",
    handle: "heavyweight-boxy-t-shirt",
    skuPrefix: "TOP02",
    description:
      "A structured tee in dense 240gsm cotton jersey with a wide, cropped body and a ribbed neckline.",
    category: "women-tops",
    type: "T-Shirt",
    tags: ["new-arrival"],
    priceUsd: 45,
    colours: [WHITE, BROWN],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "Boxy fit. The model is 175cm and wears a size S.",
    care: CARE_COTTON,
    images: [
      img("1628344880773-797b1f8ba1d1"),
      img("1593526424177-9c9c7f68d4f2"),
    ],
  },
  {
    title: "Breton Striped Long-Sleeve Top",
    handle: "breton-striped-long-sleeve-top",
    skuPrefix: "TOP03",
    description:
      "A nautical stripe in a soft cotton jersey, with a boat neck and long sleeves.",
    category: "women-tops",
    type: "Top",
    priceUsd: 59,
    colours: [ECRU, NAVY],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "Regular fit. The model is 177cm and wears a size S.",
    care: CARE_COTTON,
    images: [img("1567452524285-61f617f210bd")],
  },

  // Trousers
  {
    title: "Wide-Leg Tailored Wool Trousers",
    handle: "wide-leg-tailored-wool-trousers",
    skuPrefix: "TRS01",
    description:
      "High-rise trousers with sharp front pleats and full-length wide legs, cut from a fluid wool twill. The matching blazer completes the suit.",
    category: "women-trousers",
    collection: "wardrobe-essentials",
    type: "Trousers",
    tags: ["bestseller"],
    priceUsd: 150,
    colours: [BLACK, GREY, BROWN],
    sizes: TROUSER_SIZES,
    material: "100% wool",
    fit: "Wide leg, high rise. The model is 177cm and wears a size 34.",
    care: CARE_WOOL,
    images: [
      img("1700676194066-b9e1038058c3"),
      img("1700676195086-81b936390de4"),
    ],
  },
  {
    title: "Pleated Barrel-Leg Trousers",
    handle: "pleated-barrel-leg-trousers",
    skuPrefix: "TRS02",
    description:
      "Curved barrel-leg trousers with deep pleats and tapered ankles, for a sculptural silhouette.",
    category: "women-trousers",
    collection: "autumn-winter-2026",
    type: "Trousers",
    tags: ["new-arrival"],
    priceUsd: 135,
    colours: [CHOCOLATE, BLACK],
    sizes: TROUSER_SIZES,
    material: "68% lyocell, 32% wool",
    fit: "Barrel leg, mid rise. The model is 176cm and wears a size 34.",
    care: CARE_WOOL,
    images: [img("1700676195099-75103510df39"), img("1552902865-b72c031ac5ea")],
  },
  {
    title: "Relaxed Linen Drawstring Trousers",
    handle: "relaxed-linen-drawstring-trousers",
    skuPrefix: "TRS03",
    description:
      "Easy, full-length trousers in washed linen with a drawstring waist and side pockets.",
    category: "women-trousers",
    collection: "the-linen-edit",
    type: "Trousers",
    tags: ["sustainable-materials"],
    priceUsd: 99,
    colours: [WHITE, TERRACOTTA],
    sizes: TROUSER_SIZES,
    material: "100% linen",
    fit: "Relaxed fit, mid rise. The model is 177cm and wears a size 34.",
    care: CARE_LINEN,
    images: [
      img("1590159983013-d4ff5fc71c1d"),
      img("1580651214613-f4692d6d138f"),
    ],
  },
  {
    title: "Straight-Leg Twill Trousers",
    handle: "straight-leg-twill-trousers",
    skuPrefix: "TRS04",
    description:
      "Clean straight-leg trousers in a structured cotton twill with pressed creases and a zip fly.",
    category: "women-trousers",
    type: "Trousers",
    priceUsd: 110,
    colours: [STONE, NAVY],
    sizes: TROUSER_SIZES,
    material: "98% organic cotton, 2% elastane",
    fit: "Straight leg, mid rise. The model is 175cm and wears a size 34.",
    care: CARE_COTTON,
    images: [img("1552902875-9ac1f9fe0c07")],
  },

  // Jeans
  {
    title: "Column Straight-Leg Jeans",
    handle: "column-straight-leg-jeans",
    skuPrefix: "JNS01",
    description:
      "High-waisted, full-length jeans with a straight leg, in rigid organic cotton denim that softens with wear.",
    category: "women-jeans",
    collection: "wardrobe-essentials",
    type: "Jeans",
    tags: ["bestseller", "sustainable-materials"],
    priceUsd: 110,
    colours: [MID_BLUE, WASHED_BLACK],
    sizes: DENIM_SIZES,
    material: "100% organic cotton",
    fit: "Straight leg, high rise. The model is 177cm and wears a size 26.",
    care: CARE_DENIM,
    images: [img("1554062614-6da4fa67725a")],
  },
  {
    title: "Barrel-Leg Jeans",
    handle: "barrel-leg-jeans",
    skuPrefix: "JNS02",
    description:
      "A curved, relaxed barrel leg in a light vintage wash, with a high waist and cropped hem.",
    category: "women-jeans",
    type: "Jeans",
    tags: ["new-arrival"],
    priceUsd: 120,
    colours: [LIGHT_BLUE],
    sizes: DENIM_SIZES,
    material: "100% organic cotton",
    fit: "Barrel leg, high rise. The model is 176cm and wears a size 26.",
    care: CARE_DENIM,
    images: [img("1580651214613-f4692d6d138f")],
  },

  // Skirts
  {
    title: "Pleated Wool Midi Skirt",
    handle: "pleated-wool-midi-skirt",
    skuPrefix: "SKT01",
    description:
      "A midi skirt with sharp knife pleats that move with you, in a fine wool blend with a concealed side zip.",
    category: "women-skirts",
    collection: "autumn-winter-2026",
    type: "Skirt",
    priceUsd: 135,
    colours: [BLACK, GREY],
    sizes: APPAREL_SIZES,
    material: "70% wool, 30% recycled polyester",
    fit: "Regular fit, mid-calf length. The model is 177cm and wears a size S.",
    care: CARE_WOOL,
    images: [
      img("1708363390847-b4af54f45273"),
      img("1688589564625-5068d318c1af"),
    ],
  },
  {
    title: "A-Line Denim Midi Skirt",
    handle: "a-line-denim-midi-skirt",
    skuPrefix: "SKT02",
    description:
      "A structured A-line skirt in rigid ecru denim with a front slit and five-pocket styling.",
    category: "women-skirts",
    type: "Skirt",
    tags: ["sustainable-materials"],
    priceUsd: 99,
    colours: [ECRU],
    sizes: APPAREL_SIZES,
    material: "100% organic cotton",
    fit: "A-line, midi length. The model is 175cm and wears a size S.",
    care: CARE_DENIM,
    images: [img("1568572102473-3ceade32b8a6")],
  },
  {
    title: "Satin Bias-Cut Midi Skirt",
    handle: "satin-bias-cut-midi-skirt",
    skuPrefix: "SKT03",
    description:
      "A fluid bias-cut skirt in lustrous satin with an elasticated waist, falling to mid-calf.",
    category: "women-skirts",
    type: "Skirt",
    priceUsd: 120,
    colours: [BLACK, CHAMPAGNE],
    sizes: APPAREL_SIZES,
    material: "100% recycled polyester",
    fit: "Regular fit, midi length. The model is 177cm and wears a size S.",
    care: CARE_SYNTHETIC,
    images: [img("1762343041573-aa2827852bc9"), img("1560962223-a5af5f950015")],
  },

  // Bags
  {
    title: "Leather Crossbody Bag",
    handle: "leather-crossbody-bag",
    skuPrefix: "BAG01",
    description:
      "A compact crossbody bag in smooth vegetable-tanned leather with an adjustable strap and magnetic flap closure.",
    category: "women-bags",
    type: "Bag",
    tags: ["bestseller"],
    priceUsd: 150,
    colours: [BLACK, TAN],
    sizes: ONE_SIZE,
    material: "100% leather",
    fit: "Dimensions: 22cm x 15cm x 6cm. Strap drop: 55cm.",
    care: CARE_LEATHER,
    images: [
      img("1603219527847-24c87f552a77"),
      img("1637759292654-a12cb2be085e"),
    ],
  },
  {
    title: "Oversized Leather Tote Bag",
    handle: "oversized-leather-tote-bag",
    skuPrefix: "BAG02",
    description:
      "An unstructured tote with space for a laptop, in soft grained leather with an internal zip pocket.",
    category: "women-bags",
    collection: "wardrobe-essentials",
    type: "Bag",
    priceUsd: 225,
    colours: [BROWN, BLACK],
    sizes: ONE_SIZE,
    material: "100% leather",
    fit: "Dimensions: 42cm x 34cm x 14cm. Handle drop: 24cm.",
    care: CARE_LEATHER,
    images: [
      img("1624687943971-e86af76d57de"),
      img("1473188588951-666fce8e7c68"),
    ],
  },
  {
    title: "Curved Leather Shoulder Bag",
    handle: "curved-leather-shoulder-bag",
    skuPrefix: "BAG03",
    description:
      "A sculptural half-moon shoulder bag in polished leather with a top zip and slim shoulder strap.",
    category: "women-bags",
    collection: "atelier",
    type: "Bag",
    tags: ["new-arrival"],
    priceUsd: 190,
    colours: [BLACK],
    sizes: ONE_SIZE,
    material: "100% leather",
    fit: "Dimensions: 30cm x 16cm x 8cm. Strap drop: 25cm.",
    care: CARE_LEATHER,
    images: [
      img("1705909237050-7a7625b47fac"),
      img("1691480150204-66dd1eb77391"),
    ],
  },
  {
    title: "Structured Leather Satchel",
    handle: "structured-leather-satchel",
    skuPrefix: "BAG04",
    description:
      "A structured satchel with buckle-fastened straps, a top handle and a detachable shoulder strap.",
    category: "women-bags",
    type: "Bag",
    priceUsd: 210,
    colours: [GREY],
    sizes: ONE_SIZE,
    material: "100% leather",
    fit: "Dimensions: 28cm x 22cm x 10cm. Handle drop: 9cm.",
    care: CARE_LEATHER,
    images: [img("1605733513597-a8f8341084e6")],
  },

  // Shoes
  {
    title: "Leather Penny Loafers",
    handle: "leather-penny-loafers",
    skuPrefix: "SHO01",
    description:
      "Classic penny loafers in polished calf leather with a chunky rubber sole for everyday comfort.",
    category: "women-shoes",
    collection: "wardrobe-essentials",
    type: "Shoes",
    tags: ["bestseller"],
    priceUsd: 190,
    colours: [BLACK, BROWN],
    sizes: SHOE_SIZES,
    material: "Upper: 100% leather. Sole: rubber.",
    fit: "True to size. Heel height: 3cm.",
    care: CARE_LEATHER,
    images: [img("1559334417-01b38aec66bd"), img("1638810794193-21ac7c775487")],
  },
  {
    title: "Textured Leather Pumps",
    handle: "textured-leather-pumps",
    skuPrefix: "SHO02",
    description:
      "Pointed pumps in a pebbled leather with a slender, mid-height heel and a cushioned insole.",
    category: "women-shoes",
    type: "Shoes",
    priceUsd: 175,
    colours: [WHITE, BLACK],
    sizes: SHOE_SIZES,
    material: "Upper: 100% leather. Sole: leather.",
    fit: "True to size. Heel height: 7cm.",
    care: CARE_LEATHER,
    images: [img("1535043934128-cf0b28d52f95")],
  },
  {
    title: "Woven Leather Ballet Flats",
    handle: "woven-leather-ballet-flats",
    skuPrefix: "SHO03",
    description:
      "Soft ballet flats in hand-woven leather strips, finished with a delicate bow at the toe.",
    category: "women-shoes",
    type: "Shoes",
    tags: ["new-arrival"],
    priceUsd: 150,
    colours: [BLACK],
    sizes: SHOE_SIZES,
    material: "Upper: 100% leather. Sole: rubber.",
    fit: "Runs small, we recommend sizing up. Heel height: 1cm.",
    care: CARE_LEATHER,
    images: [img("1758542988664-49951c5b1999")],
  },
  {
    title: "Leather Chelsea Boots",
    handle: "leather-chelsea-boots",
    skuPrefix: "SHO04",
    description:
      "Ankle-height Chelsea boots in smooth leather with elasticated side panels and a lugged rubber sole.",
    category: "women-shoes",
    collection: "autumn-winter-2026",
    type: "Shoes",
    priceUsd: 250,
    colours: [BLACK, CHOCOLATE],
    sizes: SHOE_SIZES,
    material: "Upper: 100% leather. Sole: rubber.",
    fit: "True to size. Heel height: 4cm.",
    care: CARE_LEATHER,
    images: [img("1605325360282-9b0ac4ca7b76")],
  },

  // Jewellery
  {
    title: "Chunky Hoop Earrings",
    handle: "chunky-hoop-earrings",
    skuPrefix: "JWL01",
    description:
      "Bold, tubular hoops in gold-tone recycled brass, with a hinged click fastening.",
    category: "women-jewellery",
    type: "Jewellery",
    tags: ["bestseller"],
    priceUsd: 45,
    colours: [GOLD, SILVER],
    sizes: ONE_SIZE,
    material: "Recycled brass with gold-tone or silver-tone plating",
    fit: "Diameter: 3cm.",
    care: CARE_JEWELLERY,
    images: [img("1633934542430-0905ccb5f050"), img("1561828995-aa79a2db86dd")],
  },
  {
    title: "Sculptural Pendant Necklace",
    handle: "sculptural-pendant-necklace",
    skuPrefix: "JWL02",
    description:
      "An organic, hand-finished pendant on a fine curb chain with a lobster clasp.",
    category: "women-jewellery",
    collection: "atelier",
    type: "Jewellery",
    priceUsd: 59,
    colours: [GOLD],
    sizes: ONE_SIZE,
    material: "Recycled brass with gold-tone plating",
    fit: "Chain length: 45cm, with 5cm extender.",
    care: CARE_JEWELLERY,
    images: [
      img("1569397288884-4d43d6738fbd"),
      img("1585960622850-ed33c41d6418"),
    ],
  },
  {
    title: "Stacking Ring Set",
    handle: "stacking-ring-set",
    skuPrefix: "JWL03",
    description:
      "A set of three slim rings with smooth, hammered and twisted finishes, designed to be worn together or apart.",
    category: "women-jewellery",
    type: "Jewellery",
    priceUsd: 39,
    colours: [GOLD],
    sizes: ["S", "M", "L"],
    material: "Recycled brass with gold-tone plating",
    fit: "S: 16mm, M: 17mm, L: 18mm internal diameter.",
    care: CARE_JEWELLERY,
    images: [
      img("1573575154350-35e29dfd6cdc"),
      img("1673131158657-4404fd1f041a"),
    ],
  },
  {
    title: "Chain-Link Bracelet",
    handle: "chain-link-bracelet",
    skuPrefix: "JWL04",
    description:
      "A substantial chain-link bracelet with a T-bar fastening, in sterling silver or gold-tone brass.",
    category: "women-jewellery",
    type: "Jewellery",
    priceUsd: 49,
    colours: [SILVER, GOLD],
    sizes: ONE_SIZE,
    material: "Sterling silver or recycled brass with gold-tone plating",
    fit: "Length: 19cm.",
    care: CARE_JEWELLERY,
    images: [
      img("1631050165122-626a1377fbce"),
      img("1611170947204-5ab96c3e37a1"),
    ],
  },
];

export const DEMO_PRICE_LISTS: DemoPriceList[] = [
  {
    title: "Mid-Season Sale",
    description: "Demo sale prices so the storefront can render discounts.",
    discountPercent: 30,
    productHandles: [
      "relaxed-denim-chore-jacket",
      "breton-striped-long-sleeve-top",
      "barrel-leg-jeans",
      "satin-bias-cut-midi-skirt",
      "structured-leather-satchel",
      "tiered-cotton-midi-dress",
    ],
  },
];

/**
 * NGN prices are derived from USD at a fixed demo rate and rounded to the
 * nearest 500 so they read like real shelf prices (e.g. 175 USD -> 262,500).
 */
export const NGN_PER_USD = 1500;

/**
 * Colour and Size are shared (non-exclusive) product options: each colour is
 * defined once, with its swatch hex in the option value's metadata, and every
 * product links to the subset of values it comes in. The admin edits these
 * under Products > Options.
 */
export const COLOUR_OPTION = "Colour";
export const SIZE_OPTION = "Size";

/** Display order for the shared Size option's values. */
export const SIZE_ORDER = [
  ONE_SIZE[0],
  ...APPAREL_SIZES,
  ...new Set([...DENIM_SIZES, ...TROUSER_SIZES, ...SHOE_SIZES]),
].sort((a, b) => {
  const [na, nb] = [Number(a), Number(b)];
  const aNumeric = !Number.isNaN(na);
  const bNumeric = !Number.isNaN(nb);
  if (aNumeric && bNumeric) {
    return na - nb;
  }
  if (aNumeric !== bNumeric) {
    return aNumeric ? 1 : -1;
  }
  // Letter sizes keep their authored order (One Size, XS ... XL).
  return 0;
});

/** Every colour any demo product comes in, de-duplicated by name. */
export const DEMO_COLOURS: DemoColour[] = [
  ...new Map(
    DEMO_PRODUCTS.flatMap((p) => p.colours).map((c) => [c.name, c]),
  ).values(),
];
