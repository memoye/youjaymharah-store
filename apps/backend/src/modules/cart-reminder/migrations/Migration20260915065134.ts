import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260915065134 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "bag_reminder_opt_out" drop constraint if exists "bag_reminder_opt_out_email_unique";`,
    );
    this.addSql(
      `alter table if exists "bag_reminder" drop constraint if exists "bag_reminder_token_unique";`,
    );
    this.addSql(
      `alter table if exists "bag_reminder" drop constraint if exists "bag_reminder_cart_id_unique";`,
    );
    this.addSql(
      `create table if not exists "bag_reminder" ("id" text not null, "cart_id" text not null, "email" text not null, "customer_id" text null, "token" text not null, "reminders_sent" integer not null default 0, "status" text check ("status" in ('active', 'finished', 'recovered', 'stopped', 'failed')) not null default 'active', "failed_attempts" integer not null default 0, "last_sent_at" timestamptz null, "restored_at" timestamptz null, "recovered_at" timestamptz null, "order_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "bag_reminder_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_bag_reminder_deleted_at" ON "bag_reminder" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bag_reminder_cart_id_unique" ON "bag_reminder" ("cart_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bag_reminder_token_unique" ON "bag_reminder" ("token") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_bag_reminder_email" ON "bag_reminder" ("email") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "bag_reminder_opt_out" ("id" text not null, "email" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "bag_reminder_opt_out_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_bag_reminder_opt_out_deleted_at" ON "bag_reminder_opt_out" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bag_reminder_opt_out_email_unique" ON "bag_reminder_opt_out" ("email") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "bag_reminder_settings" ("id" text not null, "enabled" boolean not null default false, "first_delay_hours" integer not null default 1, "second_delay_hours" integer null, "third_delay_hours" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "bag_reminder_settings_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_bag_reminder_settings_deleted_at" ON "bag_reminder_settings" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "bag_reminder" cascade;`);

    this.addSql(`drop table if exists "bag_reminder_opt_out" cascade;`);

    this.addSql(`drop table if exists "bag_reminder_settings" cascade;`);
  }
}
