import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260914145209 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" add column if not exists "homepage_hero" jsonb not null default '{"enabled":false}', add column if not exists "featured_collection_id" text null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" drop column if exists "homepage_hero", drop column if exists "featured_collection_id";`,
    );
  }
}
