import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddItemRequests1780963300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "item_request_status" AS ENUM ('pending', 'approved', 'rejected', 'returned');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "item_requests" (
        "id"               uuid                   NOT NULL DEFAULT gen_random_uuid(),
        "requester"        varchar(200)           NOT NULL,
        "requester_avatar" varchar(10)            NOT NULL,
        "item_id"          uuid                   NOT NULL,
        "item_name"        varchar(200)           NOT NULL,
        "quantity"         integer                NOT NULL,
        "reason"           text,
        "request_date"     date                   NOT NULL,
        "return_date"      date                   NOT NULL,
        "status"           "item_request_status"  NOT NULL DEFAULT 'pending',
        "created_at"       TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "PK_item_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ir_item" FOREIGN KEY ("item_id")
          REFERENCES inventory_items(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_item_requests_status" ON "item_requests" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "item_requests"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "item_request_status"`);
  }
}
