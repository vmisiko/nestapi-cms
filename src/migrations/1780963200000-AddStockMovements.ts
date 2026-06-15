import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockMovements1780963200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "stock_movement_type" AS ENUM ('in', 'out', 'adjustment');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_movements" (
        "id"           uuid                   NOT NULL DEFAULT gen_random_uuid(),
        "item_id"      uuid                   NOT NULL,
        "item_name"    varchar(200)           NOT NULL,
        "type"         "stock_movement_type"  NOT NULL,
        "quantity"     integer                NOT NULL,
        "reason"       text,
        "performed_by" varchar(200)           NOT NULL,
        "created_at"   TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sm_item" FOREIGN KEY ("item_id")
          REFERENCES inventory_items(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_movements_item_id" ON "stock_movements" ("item_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stock_movements_created_at" ON "stock_movements" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_movements"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_movement_type"`);
  }
}
