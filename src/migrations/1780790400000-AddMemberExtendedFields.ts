import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberExtendedFields1780790400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE members
        ADD COLUMN IF NOT EXISTS "gender"           varchar(10),
        ADD COLUMN IF NOT EXISTS "age_group"        varchar(20),
        ADD COLUMN IF NOT EXISTS "church_role"      varchar(30),
        ADD COLUMN IF NOT EXISTS "is_online"        boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "is_international" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_members_phone"
        ON members(phone) WHERE phone IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_members_phone"`);
    await queryRunner.query(`
      ALTER TABLE members
        DROP COLUMN IF EXISTS "gender",
        DROP COLUMN IF EXISTS "age_group",
        DROP COLUMN IF EXISTS "church_role",
        DROP COLUMN IF EXISTS "is_online",
        DROP COLUMN IF EXISTS "is_international"
    `);
  }
}
