import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260913175310 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "size_guide" drop constraint if exists "size_guide_is_default_unique";`,
    );
    this.addSql(
      `create table if not exists "size_guide" ("id" text not null, "name" text not null, "kind" text check ("kind" in ('body', 'garment')) not null default 'body', "description" text null, "diagram_url" text null, "table" jsonb not null, "is_default" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "size_guide_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_size_guide_deleted_at" ON "size_guide" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_size_guide_is_default_unique" ON "size_guide" ("is_default") WHERE is_default = true AND deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "size_guide" cascade;`);
  }
}
