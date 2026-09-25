import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C2 (true guest-conversion metric): records every member status transition
 * with a timestamp, so retention.service.ts can measure real guest -> member
 * conversions instead of approximating from current status + join date.
 *
 * from_status is nullable to represent "member created with this status" —
 * there was no prior status to transition from.
 */
export class CreateMemberStatusHistory1781395200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "member_status_history" (
        "id"          uuid            NOT NULL DEFAULT gen_random_uuid(),
        "member_id"   uuid            NOT NULL,
        "from_status" "member_status",
        "to_status"   "member_status" NOT NULL,
        "changed_at"  TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_member_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_msh_member" FOREIGN KEY ("member_id")
          REFERENCES members(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_msh_member_changed_at"
        ON "member_status_history" ("member_id", "changed_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_msh_to_status_changed_at"
        ON "member_status_history" ("to_status", "changed_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "member_status_history"`);
  }
}
