import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B9 (scale review): indexes for columns that filter or join on tables that
 * grow with the congregation. Found via EXPLAIN ANALYZE against a throwaway
 * database seeded with 5,000 members — see docs/SCALE-REVIEW.md.
 *
 * The clearest case was /retention/at-risk-members: no index on `members`
 * covered its activity_status/status/joined_at filter, and no index on
 * attendance_records covered its per-member NOT EXISTS check, so both the
 * page query and its count query fell back to a sequential scan (1.53s at
 * 5,000 members, dominated by Postgres JIT kicking in over the inflated
 * cost estimate). With these indexes the planner switches to index scans
 * and the same request drops to ~70-80ms.
 */
export class AddScaleIndexes1781308800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_members_activity_status" ON "members" ("activity_status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_members_status" ON "members" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_members_joined_at" ON "members" ("joined_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_members_fellowship_id" ON "members" ("fellowship_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_member_status"
        ON "attendance_records" ("member_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_attendance_records_member_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_members_fellowship_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_members_joined_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_members_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_members_activity_status"`,
    );
  }
}
