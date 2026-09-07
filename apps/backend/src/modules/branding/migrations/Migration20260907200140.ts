import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260907200140 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "branding" ("id" text not null, "name" text not null, "logo_url" text null, "support_email" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "branding_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_branding_deleted_at" ON "branding" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "branding" cascade;`);
  }
}
