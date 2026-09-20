import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260920201713 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "search_term_stat" drop constraint if exists "search_term_stat_term_day_unique";`);
    this.addSql(`create table if not exists "search_term_stat" ("id" text not null, "term" text not null, "day" timestamptz not null, "searches" integer not null default 0, "last_result_count" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "search_term_stat_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_search_term_stat_deleted_at" ON "search_term_stat" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_search_term_stat_term_day_unique" ON "search_term_stat" ("term", "day") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_search_term_stat_day" ON "search_term_stat" ("day") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "search_term_stat" cascade;`);
  }

}
