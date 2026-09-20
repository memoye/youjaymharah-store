import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260920221523 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" add column if not exists "sync_pending" boolean not null default true, add column if not exists "sync_attempted_at" timestamptz null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" drop column if exists "sync_pending", drop column if exists "sync_attempted_at";`,
    );
  }
}
