import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260913215227 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" add column if not exists "seo_title" text null, add column if not exists "seo_description" text null, add column if not exists "og_image_url" text null, add column if not exists "twitter_handle" text null, add column if not exists "social_links" jsonb not null default '{}', add column if not exists "allow_indexing" boolean not null default true, add column if not exists "google_site_verification" text null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" drop column if exists "seo_title", drop column if exists "seo_description", drop column if exists "og_image_url", drop column if exists "twitter_handle", drop column if exists "social_links", drop column if exists "allow_indexing", drop column if exists "google_site_verification";`,
    );
  }
}
