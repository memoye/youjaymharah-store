import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";
import {
  addShippingMethodToCartWorkflow,
  createCartWorkflow,
  createInventoryLevelsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createPaymentCollectionForCartWorkflow,
  createProductsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export async function physicalCheckoutFixture(
  container: MedusaContainer,
  { taxInclusive = false } = {},
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  await container.resolve(Modules.PRICING).createPricePreferences({
    attribute: "currency_code",
    value: "ngn",
    is_tax_inclusive: taxInclusive,
  });
  const channel = await container
    .resolve(Modules.SALES_CHANNEL)
    .createSalesChannels({
      name: "Physical checkout test channel",
    });
  const region = await container.resolve(Modules.REGION).createRegions({
    name: "Physical checkout test region",
    currency_code: "ngn",
    countries: ["ng"],
  });
  // Cart completion only accepts providers enabled in the cart's region, the
  // same link initial-data-seed creates for the real one.
  await link.create({
    [Modules.REGION]: { region_id: region.id },
    [Modules.PAYMENT]: { payment_provider_id: "pp_paystack_paystack" },
  });
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "ng",
        provider_id: "tp_system",
        default_tax_rate: { name: "Test VAT", code: "TEST-VAT", rate: 7.5 },
      },
    ],
  });
  const location = await container
    .resolve(Modules.STOCK_LOCATION)
    .createStockLocations({
      name: "Physical checkout test warehouse",
      address: {
        address_1: "Test warehouse",
        city: "Lagos",
        country_code: "ng",
      },
    });
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: location.id, add: [channel.id] },
  });
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });
  await createLocationFulfillmentSetWorkflow(container).run({
    input: {
      location_id: location.id,
      fulfillment_set_data: { name: "Test delivery", type: "shipping" },
    },
  });
  const {
    data: [stockLocation],
  } = await query.graph({
    entity: "stock_location",
    fields: ["fulfillment_sets.id"],
    filters: { id: location.id },
  });
  const { result: zones } = await createServiceZonesWorkflow(container).run({
    input: {
      data: [
        {
          name: "Test NG zone",
          fulfillment_set_id: stockLocation.fulfillment_sets![0]!.id,
          geo_zones: [{ type: "country", country_code: "ng" }],
        },
      ],
    },
  });
  const profile = await container
    .resolve(Modules.FULFILLMENT)
    .createShippingProfiles({
      name: "Physical checkout test profile",
      type: "default",
    });
  const { result: options } = await createShippingOptionsWorkflow(
    container,
  ).run({
    input: [
      {
        name: "Test delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zones[0].id,
        shipping_profile_id: profile.id,
        type: {
          label: "Test delivery",
          code: "test-delivery",
          description: "Test only",
        },
        prices: [{ currency_code: "ngn", amount: taxInclusive ? 215 : 200 }],
        rules: [
          { attribute: "enabled_in_store", operator: "eq", value: "true" },
          { attribute: "is_return", operator: "eq", value: "false" },
        ],
      },
    ],
  });
  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Physical checkout test product",
          handle: "physical-checkout-test-product",
          status: "published",
          shipping_profile_id: profile.id,
          sales_channels: [{ id: channel.id }],
          options: [{ title: "Size", values: ["One"] }],
          variants: [
            {
              title: "One",
              sku: "physical-checkout-test",
              manage_inventory: true,
              allow_backorder: false,
              options: { Size: "One" },
              prices: [
                { currency_code: "ngn", amount: taxInclusive ? 1075 : 1000 },
              ],
            },
          ],
        },
      ],
    },
  });
  const variantId = products[0].variants[0].id;
  const {
    data: [variant],
  } = await query.graph({
    entity: "product_variant",
    fields: ["inventory_items.inventory_item_id"],
    filters: { id: variantId },
  });
  const inventoryItemId = variant.inventory_items![0]!.inventory_item_id;
  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: [
        {
          location_id: location.id,
          inventory_item_id: inventoryItemId,
          stocked_quantity: 1,
        },
      ],
    },
  });

  async function cart(withShipping = true) {
    const { result } = await createCartWorkflow(container).run({
      input: {
        region_id: region.id,
        sales_channel_id: channel.id,
        email: "physical-checkout@example.com",
        shipping_address: {
          first_name: "Test",
          last_name: "Buyer",
          address_1: "Test address",
          city: "Lagos",
          country_code: "ng",
        },
        items: [{ variant_id: variantId, quantity: 1 }],
      },
    });
    if (withShipping) {
      await addShippingMethodToCartWorkflow(container).run({
        input: { cart_id: result.id, options: [{ id: options[0].id }] },
      });
    }
    const { result: collection } = await createPaymentCollectionForCartWorkflow(
      container,
    ).run({
      input: { cart_id: result.id },
    });
    const session = await container
      .resolve(Modules.PAYMENT)
      .createPaymentSession(collection.id, {
        provider_id: "pp_paystack_paystack",
        currency_code: "ngn",
        amount: collection.amount,
        data: { payer: { email: "physical-checkout@example.com" } },
      });
    return {
      id: result.id,
      collectionId: collection.id,
      sessionId: session.id,
    };
  }

  async function stock() {
    const [level] = await container
      .resolve(Modules.INVENTORY)
      .listInventoryLevels({
        inventory_item_id: inventoryItemId,
        location_id: location.id,
      });
    const reservations = await container
      .resolve(Modules.INVENTORY)
      .listReservationItems({
        inventory_item_id: inventoryItemId,
        location_id: location.id,
      });
    return { level, reservations };
  }

  return { cart, stock, inventoryItemId, locationId: location.id };
}
