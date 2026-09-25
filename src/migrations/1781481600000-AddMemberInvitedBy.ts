import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C5a: who invited a member. invited_by_member_id is used when the inviter
 * is themselves a member; invited_by_name is a free-text fallback for an
 * inviter who isn't in the system yet (e.g. a friend who brought a guest).
 * Only one is expected to be set at a time — enforced in the DTO layer, not
 * the schema, to keep this migration simple.
 */
export class AddMemberInvitedBy1781481600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "members"
        ADD COLUMN IF NOT EXISTS "invited_by_member_id" uuid,
        ADD COLUMN IF NOT EXISTS "invited_by_name" varchar(200)
    `);
    await queryRunner.query(`
      ALTER TABLE "members"
        ADD CONSTRAINT "FK_members_invited_by"
        FOREIGN KEY ("invited_by_member_id") REFERENCES members(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_members_invited_by_member_id"
        ON "members" ("invited_by_member_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_members_invited_by_member_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "FK_members_invited_by"`,
    );
    await queryRunner.query(`
      ALTER TABLE "members"
        DROP COLUMN IF EXISTS "invited_by_member_id",
        DROP COLUMN IF EXISTS "invited_by_name"
    `);
  }
}
