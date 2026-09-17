import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFollowUpTables1781049600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_status" AS ENUM ('open', 'completed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_contact_method" AS ENUM ('call', 'sms', 'email', 'visit', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_outcome" AS ENUM ('connected', 'no_answer', 'requested_callback', 'not_interested', 'wrong_number', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_up_tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "member_id" uuid NOT NULL,
        "owner_id" uuid,
        "title" varchar(200) NOT NULL,
        "notes" text,
        "due_date" date NOT NULL,
        "status" "follow_up_status" NOT NULL DEFAULT 'open',
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follow_up_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_follow_up_tasks_member" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follow_up_tasks_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_follow_up_tasks_status_due_date"
        ON "follow_up_tasks" ("status", "due_date")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_up_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "task_id" uuid NOT NULL,
        "contact_method" "follow_up_contact_method" NOT NULL,
        "outcome" "follow_up_outcome" NOT NULL,
        "notes" text,
        "contacted_at" timestamptz NOT NULL DEFAULT now(),
        "created_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follow_up_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_follow_up_attempts_task" FOREIGN KEY ("task_id") REFERENCES "follow_up_tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follow_up_attempts_creator" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_follow_up_attempts_task_contacted_at"
        ON "follow_up_attempts" ("task_id", "contacted_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_up_attempts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_up_tasks"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_outcome"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_contact_method"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_status"`);
  }
}
