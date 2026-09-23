import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260923090458 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "email_delivery" ("id" text not null, "status" text check ("status" in ('prepared', 'attempted', 'accepted', 'needs_review')) not null default 'prepared', "payload_ciphertext" text null, "first_attempt_at" timestamptz null, "accepted_at" timestamptz null, "provider_id" text null, "attempts" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_delivery_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_delivery_deleted_at" ON "email_delivery" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_delivery" cascade;`);
  }
}
