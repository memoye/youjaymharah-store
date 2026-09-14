import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260913215219 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "branding" add column if not exists "favicon_url" text null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "branding" drop column if exists "favicon_url";`,
    );
  }
}
