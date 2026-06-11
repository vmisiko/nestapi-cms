import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembersTargetGroup1780876800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "message_target_group" ADD VALUE IF NOT EXISTS 'members'
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD COLUMN IF NOT EXISTS "member_ids" uuid[] NOT NULL DEFAULT '{}'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages" DROP COLUMN IF EXISTS "member_ids"
    `);
  }
}
