import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Renames the module's tables from bag_* to cart_*, keeping their rows. The
 * module was first created as "bag reminders" (Migration20260915065134); code
 * now says "cart" and keeps "shopping bag" for shopper-facing copy only.
 */

const TABLES: [string, string][] = [
  ["bag_reminder", "cart_reminder"],
  ["bag_reminder_opt_out", "cart_reminder_opt_out"],
  ["bag_reminder_settings", "cart_reminder_settings"],
];

const CONSTRAINTS: [string, string, string][] = [
  ["cart_reminder", "bag_reminder_pkey", "cart_reminder_pkey"],
  ["cart_reminder", "bag_reminder_status_check", "cart_reminder_status_check"],
  [
    "cart_reminder_opt_out",
    "bag_reminder_opt_out_pkey",
    "cart_reminder_opt_out_pkey",
  ],
  [
    "cart_reminder_settings",
    "bag_reminder_settings_pkey",
    "cart_reminder_settings_pkey",
  ],
];

const INDEXES: [string, string][] = [
  ["IDX_bag_reminder_deleted_at", "IDX_cart_reminder_deleted_at"],
  ["IDX_bag_reminder_cart_id_unique", "IDX_cart_reminder_cart_id_unique"],
  ["IDX_bag_reminder_token_unique", "IDX_cart_reminder_token_unique"],
  ["IDX_bag_reminder_email", "IDX_cart_reminder_email"],
  [
    "IDX_bag_reminder_opt_out_deleted_at",
    "IDX_cart_reminder_opt_out_deleted_at",
  ],
  [
    "IDX_bag_reminder_opt_out_email_unique",
    "IDX_cart_reminder_opt_out_email_unique",
  ],
  [
    "IDX_bag_reminder_settings_deleted_at",
    "IDX_cart_reminder_settings_deleted_at",
  ],
];

/** Renames a constraint only when it exists under the old name. */
function renameConstraint(table: string, from: string, to: string): string {
  return `do $$ begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = '${table}' and c.conname = '${from}'
  ) then
    alter table "${table}" rename constraint "${from}" to "${to}";
  end if;
end $$;`;
}

export class Migration20260917080000 extends Migration {
  override async up(): Promise<void> {
    for (const [from, to] of TABLES) {
      this.addSql(`alter table if exists "${from}" rename to "${to}";`);
    }

    for (const [table, from, to] of CONSTRAINTS) {
      this.addSql(renameConstraint(table, from, to));
    }

    for (const [from, to] of INDEXES) {
      this.addSql(`alter index if exists "${from}" rename to "${to}";`);
    }

    this.addSql(
      `update "cart_reminder_settings" set "id" = 'cart_reminder_settings_default' where "id" = 'bag_reminder_settings_default';`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `update "cart_reminder_settings" set "id" = 'bag_reminder_settings_default' where "id" = 'cart_reminder_settings_default';`,
    );

    for (const [from, to] of INDEXES) {
      this.addSql(`alter index if exists "${to}" rename to "${from}";`);
    }

    for (const [table, from, to] of CONSTRAINTS) {
      this.addSql(renameConstraint(table, to, from));
    }

    for (const [from, to] of TABLES) {
      this.addSql(`alter table if exists "${to}" rename to "${from}";`);
    }
  }
}
