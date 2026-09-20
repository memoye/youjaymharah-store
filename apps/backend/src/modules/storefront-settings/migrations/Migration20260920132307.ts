import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260920132307 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" alter column "store_menu_cards" type jsonb using ("store_menu_cards"::jsonb);`,
    );
    this.addSql(
      `alter table if exists "storefront_settings" alter column "store_menu_cards" set default '{"items":[]}';`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_settings" alter column "store_menu_cards" type jsonb using ("store_menu_cards"::jsonb);`,
    );
    this.addSql(
      `alter table if exists "storefront_settings" alter column "store_menu_cards" set default '[]';`,
    );
  }
}
