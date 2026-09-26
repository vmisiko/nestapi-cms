import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C5d: welfare and care case log. Scoped without the source PRD (see
 * docs/PENDING-WORK.md's C5 scoping note) -- a flat log of care contacts
 * against a member, mirroring the shape of follow_up_tasks rather than
 * inventing a new pattern.
 */
export class CreateCareRecords1781740800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "care_record_type" AS ENUM (
          'visit', 'call', 'hospital', 'bereavement', 'financial_need', 'other'
        );
        CREATE TYPE "care_record_status" AS ENUM ('open', 'resolved');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "care_records" (
        "id"          uuid                  NOT NULL DEFAULT gen_random_uuid(),
        "member_id"   uuid                  NOT NULL,
        "type"        "care_record_type"    NOT NULL,
        "notes"       text,
        "handled_by"  uuid,
        "status"      "care_record_status"  NOT NULL DEFAULT 'open',
        "created_at"  TIMESTAMPTZ           NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ           NOT NULL DEFAULT now(),
        "resolved_at" TIMESTAMPTZ,
        CONSTRAINT "PK_care_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_care_records_member" FOREIGN KEY ("member_id")
          REFERENCES members(id) ON DELETE CASCADE,
        CONSTRAINT "FK_care_records_handled_by" FOREIGN KEY ("handled_by")
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_care_records_member_created_at"
        ON "care_records" ("member_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_care_records_status"
        ON "care_records" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "care_records"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "care_record_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "care_record_type"`);
  }
}
