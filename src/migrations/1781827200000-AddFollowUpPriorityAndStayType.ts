import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive only: follow-up task priority (defaults to 'normal' so every
 * existing row stays valid) and a nullable stay type on members.
 */
export class AddFollowUpPriorityAndStayType1781827200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "follow_up_tasks"
        ADD COLUMN IF NOT EXISTS "priority" "follow_up_priority" NOT NULL DEFAULT 'normal'
    `);
    await queryRunner.query(`
      ALTER TABLE "members"
        ADD COLUMN IF NOT EXISTS "stay_type" varchar(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "members" DROP COLUMN IF EXISTS "stay_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow_up_tasks" DROP COLUMN IF EXISTS "priority"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_priority"`);
  }
}
