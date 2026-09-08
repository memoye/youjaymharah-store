import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260907212840 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" drop constraint if exists "newsletter_subscriber_token_unique";`,
    );
    this.addSql(
      `alter table if exists "newsletter_subscriber" drop constraint if exists "newsletter_subscriber_email_unique";`,
    );
    this.addSql(
      `create table if not exists "newsletter_settings" ("id" text not null, "enabled" boolean not null default false, "audience_id" text null, "double_opt_in" boolean not null default true, "consent_text" text null, "success_message" text null, "reply_to" text null, "checkout_opt_in" boolean not null default false, "checkout_label" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "newsletter_settings_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_newsletter_settings_deleted_at" ON "newsletter_settings" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "newsletter_subscriber" ("id" text not null, "email" text not null, "status" text check ("status" in ('pending', 'subscribed', 'unsubscribed')) not null, "source" text null, "consent_text" text null, "consent_at" timestamptz null, "confirmed_at" timestamptz null, "unsubscribed_at" timestamptz null, "token" text not null, "resend_contact_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "newsletter_subscriber_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_deleted_at" ON "newsletter_subscriber" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_email_unique" ON "newsletter_subscriber" ("email") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_token_unique" ON "newsletter_subscriber" ("token") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "newsletter_settings" cascade;`);

    this.addSql(`drop table if exists "newsletter_subscriber" cascade;`);
  }
}
