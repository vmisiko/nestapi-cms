import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAutomationTables1781136000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "automation_trigger" AS ENUM ('visitor_signup', 'inactivity_sweep', 'escalation_sweep', 'scheduled_message_dispatch');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "automation_run_status" AS ENUM ('success', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follow_up_source" AS ENUM ('manual', 'visitor_automation', 'inactivity_automation');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "trigger" "automation_trigger" NOT NULL,
        "status" "automation_run_status" NOT NULL,
        "items_processed" int NOT NULL DEFAULT 0,
        "items_created" int NOT NULL DEFAULT 0,
        "detail" text,
        "ran_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automation_runs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_automation_runs_trigger_ran_at"
        ON "automation_runs" ("trigger", "ran_at" DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE "follow_up_tasks"
        ADD COLUMN IF NOT EXISTS "source" "follow_up_source" NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS "escalation_level" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "escalated_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "escalated_to_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "follow_up_tasks"
        ADD CONSTRAINT "FK_follow_up_tasks_escalated_to" FOREIGN KEY ("escalated_to_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_follow_up_tasks_source"
        ON "follow_up_tasks" ("source", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_up_escalations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "task_id" uuid NOT NULL,
        "from_owner_id" uuid,
        "to_owner_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "escalated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follow_up_escalations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_follow_up_escalations_task" FOREIGN KEY ("task_id") REFERENCES "follow_up_tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follow_up_escalations_from_owner" FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_follow_up_escalations_to_owner" FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_follow_up_escalations_task"
        ON "follow_up_escalations" ("task_id", "escalated_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "link" text,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_created_at"
        ON "notifications" ("user_id", "created_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_up_escalations"`);
    await queryRunner.query(`
      ALTER TABLE "follow_up_tasks"
        DROP CONSTRAINT IF EXISTS "FK_follow_up_tasks_escalated_to",
        DROP COLUMN IF EXISTS "escalated_to_id",
        DROP COLUMN IF EXISTS "escalated_at",
        DROP COLUMN IF EXISTS "escalation_level",
        DROP COLUMN IF EXISTS "source"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_runs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_source"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "automation_run_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "automation_trigger"`);
  }
}
