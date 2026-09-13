import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260913162322 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_alert" drop constraint if exists "product_alert_status_check";`,
    );

    this.addSql(
      `alter table if exists "product_alert" add column if not exists "failed_attempts" integer not null default 0;`,
    );
    this.addSql(
      `alter table if exists "product_alert" add constraint "product_alert_status_check" check("status" in ('waiting', 'sent', 'cancelled', 'failed'));`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "product_alert" drop constraint if exists "product_alert_status_check";`,
    );

    this.addSql(
      `alter table if exists "product_alert" drop column if exists "failed_attempts";`,
    );

    this.addSql(
      `alter table if exists "product_alert" add constraint "product_alert_status_check" check("status" in ('waiting', 'sent', 'cancelled'));`,
    );
  }
}
