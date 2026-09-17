import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260913135538 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "wishlist" alter column "customer_id" type text using ("customer_id"::text);`,
    );
    this.addSql(
      `alter table if exists "wishlist" alter column "customer_id" drop not null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "wishlist" alter column "customer_id" type text using ("customer_id"::text);`,
    );
    this.addSql(
      `alter table if exists "wishlist" alter column "customer_id" set not null;`,
    );
  }
}
