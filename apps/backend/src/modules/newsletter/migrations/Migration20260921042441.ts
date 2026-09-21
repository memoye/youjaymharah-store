import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260921042441 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "resend_webhook_event" ("id" text not null, "event_type" text not null, "occurred_at" timestamptz not null, "payload" jsonb null, "processed_at" timestamptz null, "attempted_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "resend_webhook_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_resend_webhook_event_deleted_at" ON "resend_webhook_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "newsletter_subscriber" add column if not exists "provider_consent_at" timestamptz null, add column if not exists "email_suppressed_at" timestamptz null, add column if not exists "email_suppression_reason" text check ("email_suppression_reason" in ('hard_bounce', 'complaint', 'provider_suppression')) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "resend_webhook_event" cascade;`);

    this.addSql(`alter table if exists "newsletter_subscriber" drop column if exists "provider_consent_at", drop column if exists "email_suppressed_at", drop column if exists "email_suppression_reason";`);
  }

}
