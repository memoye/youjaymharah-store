import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260920143505 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`do $$ begin
      if exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'storefront_settings' and column_name = 'store_menu_promos')
        and not exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'storefront_settings' and column_name = 'store_menu_cards') then
        alter table "storefront_settings" rename column "store_menu_promos" to "store_menu_cards";
      end if;
    end $$;`);
  }

  override async down(): Promise<void> {
    this.addSql(`do $$ begin
      if exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'storefront_settings' and column_name = 'store_menu_cards')
        and not exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'storefront_settings' and column_name = 'store_menu_promos') then
        alter table "storefront_settings" rename column "store_menu_cards" to "store_menu_promos";
      end if;
    end $$;`);
  }
}
