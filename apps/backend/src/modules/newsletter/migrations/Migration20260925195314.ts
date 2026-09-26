import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260925195314 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "newsletter_settings" add column if not exists "heading" text null, add column if not exists "description" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "newsletter_settings" drop column if exists "heading", drop column if exists "description";`);
  }

}
