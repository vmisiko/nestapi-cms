import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageDeliveries1780617600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "delivery_status" AS ENUM ('pending', 'sent', 'delivered', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message_deliveries" (
        "id"             uuid              NOT NULL DEFAULT gen_random_uuid(),
        "message_id"     uuid              NOT NULL,
        "member_id"      uuid              NOT NULL,
        "member_name"    varchar(255)      NOT NULL,
        "phone"          varchar(30)       NOT NULL,
        "text"           text              NOT NULL,
        "status"         "delivery_status" NOT NULL DEFAULT 'pending',
        "uwazii_ref"     varchar(100),
        "failure_reason" text,
        "sent_at"        TIMESTAMPTZ,
        "delivered_at"   TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_md_message" FOREIGN KEY ("message_id")
          REFERENCES messages(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_md_message_id"
        ON message_deliveries(message_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_md_uwazii_ref"
        ON message_deliveries(uwazii_ref) WHERE uwazii_ref IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "message_deliveries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_status"`);
  }
}
