import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260920143505 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "storefront_settings" rename column "store_menu_promos" to "store_menu_cards";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "storefront_settings" rename column "store_menu_cards" to "store_menu_promos";`);
  }

}
