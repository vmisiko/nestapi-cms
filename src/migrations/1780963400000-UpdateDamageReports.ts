import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDamageReports1780963400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old PostgreSQL enum used by the status column (if it exists)
    await queryRunner.query(`
      ALTER TABLE "damage_reports"
        ALTER COLUMN "status" TYPE varchar(30) USING status::text
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "damage_report_status"`);

    // Drop old columns that are being replaced
    await queryRunner.query(`
      ALTER TABLE "damage_reports"
        DROP COLUMN IF EXISTS "quantity_damaged",
        DROP COLUMN IF EXISTS "reported_by",
        DROP COLUMN IF EXISTS "resolved_at"
    `);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "damage_reports"
        ADD COLUMN IF NOT EXISTS "reported_by_name" varchar(200) NOT NULL DEFAULT 'Unknown',
        ADD COLUMN IF NOT EXISTS "damage_type"      varchar(20)  NOT NULL DEFAULT 'other',
        ADD COLUMN IF NOT EXISTS "severity"         varchar(20)  NOT NULL DEFAULT 'moderate',
        ADD COLUMN IF NOT EXISTS "quantity_affected" integer     NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "report_date"      date         NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "resolution"       text
    `);

    // Set a sensible default status for any existing rows
    await queryRunner.query(`
      UPDATE "damage_reports"
        SET "status" = 'pending'
        WHERE "status" NOT IN ('pending', 'investigating', 'resolved', 'written_off')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "damage_reports"
        DROP COLUMN IF EXISTS "reported_by_name",
        DROP COLUMN IF EXISTS "damage_type",
        DROP COLUMN IF EXISTS "severity",
        DROP COLUMN IF EXISTS "quantity_affected",
        DROP COLUMN IF EXISTS "report_date",
        DROP COLUMN IF EXISTS "resolution"
    `);

    await queryRunner.query(`
      CREATE TYPE "damage_report_status" AS ENUM ('pending', 'reviewed', 'resolved')
    `);

    await queryRunner.query(`
      ALTER TABLE "damage_reports"
        ADD COLUMN "quantity_damaged" integer NOT NULL DEFAULT 0,
        ADD COLUMN "reported_by"     uuid,
        ADD COLUMN "resolved_at"     timestamptz,
        ALTER COLUMN "status" TYPE "damage_report_status"
          USING CASE status
            WHEN 'resolved'  THEN 'resolved'::"damage_report_status"
            ELSE             'pending'::"damage_report_status"
          END
    `);
  }
}
