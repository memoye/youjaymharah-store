import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260913203536 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "storefront_settings" ("id" text not null, "new_badge_days" integer not null default 30, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "storefront_settings_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_storefront_settings_deleted_at" ON "storefront_settings" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_settings" cascade;`);
  }
}
