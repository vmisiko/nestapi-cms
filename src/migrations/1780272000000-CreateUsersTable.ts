import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1780272000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role" AS ENUM ('super_admin', 'admin', 'staff');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                 uuid         NOT NULL DEFAULT gen_random_uuid(),
        "email"              varchar(255) NOT NULL,
        "password_hash"      varchar(255) NOT NULL,
        "role"               "user_role"  NOT NULL DEFAULT 'staff',
        "is_active"          boolean      NOT NULL DEFAULT true,
        "refresh_token_hash" varchar(255),
        "last_login_at"      TIMESTAMPTZ,
        "created_at"         TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users"       PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
