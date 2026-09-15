import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260915060424 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "homepage_hero_revision" ("id" text not null, "hero" jsonb not null, "replaced_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "homepage_hero_revision_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_homepage_hero_revision_deleted_at" ON "homepage_hero_revision" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "homepage_hero_revision" cascade;`);
  }
}
