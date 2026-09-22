import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings inventory_categories, inventory_items and member_departments in line with their
 * current entities. All three were changed at some point after their original migration
 * (a leader on categories, a stock/condition model on items, dropping the role/joined_at
 * columns on the member-department join table) but only ever applied locally through
 * TypeORM's `synchronize`, never through a migration — so a database built from migrations
 * alone was still on the old shape. Discovered while testing migrations against an empty
 * database for B7 in docs/PENDING-WORK.md.
 */
export class FixInventorySchemaDrift1781222400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // inventory_categories: add the optional leader
    await queryRunner.query(`
      ALTER TABLE "inventory_categories"
        ADD COLUMN IF NOT EXISTS "leader_id" uuid
    `);

    // inventory_items: replace the freeform quantity/unit/location model with the
    // total/available stock-count model that stock_movements and item_requests assume.
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "inventory_items_condition_enum" AS ENUM ('excellent', 'good', 'fair', 'poor');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items"
        ADD COLUMN IF NOT EXISTS "code"          varchar(50),
        ADD COLUMN IF NOT EXISTS "total_qty"     integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "available_qty" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "condition"      "inventory_items_condition_enum"
    `);

    // Carry over existing rows' quantity into the new columns, and manufacture a code for
    // rows that don't have one, before the column is made required.
    await queryRunner.query(`
      UPDATE "inventory_items"
        SET "total_qty" = COALESCE("quantity", 0), "available_qty" = COALESCE("quantity", 0)
        WHERE "total_qty" = 0 AND "available_qty" = 0
    `);
    await queryRunner.query(`
      UPDATE "inventory_items"
        SET "code" = 'ITEM-' || substr("id"::text, 1, 8)
        WHERE "code" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items"
        ALTER COLUMN "code" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_items"
        ADD CONSTRAINT "UQ_inventory_items_code" UNIQUE ("code")
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items"
        DROP COLUMN IF EXISTS "quantity",
        DROP COLUMN IF EXISTS "unit",
        DROP COLUMN IF EXISTS "min_stock_level",
        DROP COLUMN IF EXISTS "location",
        DROP COLUMN IF EXISTS "description"
    `);

    // member_departments: drop back to a plain join table (member_id, department_id), the
    // shape @JoinTable on MemberEntity.departments actually produces.
    await queryRunner.query(`
      ALTER TABLE "member_departments"
        DROP CONSTRAINT IF EXISTS "PK_member_departments"
    `);
    await queryRunner.query(`
      ALTER TABLE "member_departments"
        ADD CONSTRAINT "PK_member_departments" PRIMARY KEY ("member_id", "department_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "member_departments"
        DROP COLUMN IF EXISTS "id",
        DROP COLUMN IF EXISTS "role",
        DROP COLUMN IF EXISTS "joined_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "member_departments"
        ADD COLUMN "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        ADD COLUMN "role"       varchar(100),
        ADD COLUMN "joined_at"  date NOT NULL DEFAULT CURRENT_DATE
    `);
    await queryRunner.query(`
      ALTER TABLE "member_departments"
        DROP CONSTRAINT IF EXISTS "PK_member_departments"
    `);
    await queryRunner.query(`
      ALTER TABLE "member_departments"
        ADD CONSTRAINT "PK_member_departments" PRIMARY KEY ("id")
    `);
    await queryRunner.query(`
      ALTER TABLE "member_departments"
        ADD CONSTRAINT "UQ_member_dept" UNIQUE ("member_id", "department_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items"
        ADD COLUMN "quantity"        integer NOT NULL DEFAULT 0,
        ADD COLUMN "unit"            varchar(50) NOT NULL DEFAULT 'unit',
        ADD COLUMN "min_stock_level" integer NOT NULL DEFAULT 0,
        ADD COLUMN "location"        varchar(255),
        ADD COLUMN "description"     text
    `);
    await queryRunner.query(`
      UPDATE "inventory_items" SET "quantity" = "total_qty"
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_items"
        DROP CONSTRAINT IF EXISTS "UQ_inventory_items_code",
        DROP COLUMN IF EXISTS "code",
        DROP COLUMN IF EXISTS "total_qty",
        DROP COLUMN IF EXISTS "available_qty",
        DROP COLUMN IF EXISTS "condition"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "inventory_items_condition_enum"`,
    );

    await queryRunner.query(`
      ALTER TABLE "inventory_categories"
        DROP COLUMN IF EXISTS "leader_id"
    `);
  }
}
