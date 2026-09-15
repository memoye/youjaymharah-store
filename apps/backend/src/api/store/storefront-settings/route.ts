import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { BRANDING_MODULE } from "../../../modules/branding";
import type BrandingModuleService from "../../../modules/branding/service";
import { STOREFRONT_SETTINGS_MODULE } from "../../../modules/storefront-settings";
import { completeHomepageHero } from "../../../modules/storefront-settings/homepage-hero";
import type StorefrontSettingsModuleService from "../../../modules/storefront-settings/service";
import { completeSocialLinks } from "../../../modules/storefront-settings/social-networks";

/**
 * Everything the storefront renders its shell and home page with: the brand,
 * the defaults for search results and link previews, the home page content,
 * and product display settings. Public and identical for every shopper, so
 * pages can read it and stay cached. Each field is listed explicitly, so a
 * setting added later is not exposed by accident.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandingService: BrandingModuleService =
    req.scope.resolve(BRANDING_MODULE);
  const settingsService: StorefrontSettingsModuleService = req.scope.resolve(
    STOREFRONT_SETTINGS_MODULE,
  );

  const [brand, settings] = await Promise.all([
    brandingService.retrieveSettings(),
    settingsService.retrieveSettings(),
  ]);

  res.json({
    settings: {
      brand: {
        name: brand.name,
        logo_url: brand.logo_url,
        favicon_url: brand.favicon_url,
        support_email: brand.support_email,
      },
      seo: {
        title: settings.seo_title,
        description: settings.seo_description,
        og_image_url: settings.og_image_url,
        twitter_handle: settings.twitter_handle,
        social_links: completeSocialLinks(
          settings.social_links as Record<string, unknown>,
        ),
        allow_indexing: settings.allow_indexing,
        google_site_verification: settings.google_site_verification,
      },
      homepage: {
        hero: completeHomepageHero(
          settings.homepage_hero as Record<string, unknown>,
        ),
        featured_collection_id: await existingCollectionId(
          req,
          settings.featured_collection_id,
        ),
      },
      products: {
        new_badge_days: settings.new_badge_days,
      },
    },
  });
};

/**
 * The featured collection's id, or null once that collection has been
 * deleted, so the storefront never asks for a collection that 404s.
 */
async function existingCollectionId(
  req: MedusaRequest,
  id: string | null,
): Promise<string | null> {
  if (!id) {
    return null;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_collection",
    fields: ["id"],
    filters: { id },
  });

  return data.length ? id : null;
}
