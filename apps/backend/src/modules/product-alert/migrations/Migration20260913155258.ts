import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260913155258 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "product_alert" ("id" text not null, "email" text not null, "customer_id" text null, "product_id" text not null, "variant_id" text null, "sales_channel_id" text not null, "reason" text check ("reason" in ('restock', 'launch')) not null, "status" text check ("status" in ('waiting', 'sent', 'cancelled')) not null default 'waiting', "notified_at" timestamptz null, "cancelled_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_alert_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_alert_deleted_at" ON "product_alert" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_alert_status_product_id" ON "product_alert" ("status", "product_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_alert_email_status" ON "product_alert" ("email", "status") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_alert_customer_id" ON "product_alert" ("customer_id") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_alert" cascade;`);
  }
}
