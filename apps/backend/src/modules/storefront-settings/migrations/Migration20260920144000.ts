import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260920144000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" add column if not exists "store_menu_cards" jsonb not null default '{"items":[]}';`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" drop column if exists "store_menu_cards";`,
    );
  }
}
