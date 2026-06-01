import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhase3Tables1780531200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "session_type" AS ENUM (
          'sunday_service', 'midweek_service', 'fellowship', 'special_event'
        );
        CREATE TYPE "attendance_status" AS ENUM ('present', 'absent', 'excused');
        CREATE TYPE "message_type" AS ENUM (
          'announcement', 'newsletter', 'reminder', 'alert'
        );
        CREATE TYPE "message_target_group" AS ENUM (
          'all', 'fellowship', 'department', 'zone'
        );
        CREATE TYPE "message_status" AS ENUM ('draft', 'sent');
        CREATE TYPE "damage_report_status" AS ENUM ('pending', 'reviewed', 'resolved');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // attendance_sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_sessions" (
        "id"           uuid             NOT NULL DEFAULT gen_random_uuid(),
        "title"        varchar(200)     NOT NULL,
        "session_type" "session_type"   NOT NULL DEFAULT 'sunday_service',
        "session_date" date             NOT NULL,
        "fellowship_id" uuid,
        "notes"        text,
        "created_at"   TIMESTAMPTZ      NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ      NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_sessions" PRIMARY KEY ("id")
      )
    `);

    // attendance_records
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_records" (
        "id"            uuid               NOT NULL DEFAULT gen_random_uuid(),
        "session_id"    uuid               NOT NULL,
        "member_id"     uuid               NOT NULL,
        "status"        "attendance_status" NOT NULL DEFAULT 'present',
        "checked_in_at" TIMESTAMPTZ,
        "notes"         text,
        "created_at"    TIMESTAMPTZ        NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ        NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_records"    PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attendance_member_session" UNIQUE ("session_id", "member_id"),
        CONSTRAINT "FK_ar_session" FOREIGN KEY ("session_id")
          REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        CONSTRAINT "FK_ar_member" FOREIGN KEY ("member_id")
          REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    // messages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id"           uuid                   NOT NULL DEFAULT gen_random_uuid(),
        "title"        varchar(255)           NOT NULL,
        "body"         text                   NOT NULL,
        "type"         "message_type"         NOT NULL DEFAULT 'announcement',
        "target_group" "message_target_group" NOT NULL DEFAULT 'all',
        "target_id"    uuid,
        "status"       "message_status"       NOT NULL DEFAULT 'draft',
        "scheduled_at" TIMESTAMPTZ,
        "sent_at"      TIMESTAMPTZ,
        "created_by"   uuid                   NOT NULL,
        "created_at"   TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_created_by" FOREIGN KEY ("created_by")
          REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    // inventory_categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_categories" (
        "id"          uuid         NOT NULL DEFAULT gen_random_uuid(),
        "name"        varchar(100) NOT NULL,
        "description" text,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_inventory_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_inventory_categories"      PRIMARY KEY ("id")
      )
    `);

    // inventory_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_items" (
        "id"              uuid         NOT NULL DEFAULT gen_random_uuid(),
        "name"            varchar(200) NOT NULL,
        "category_id"     uuid         NOT NULL,
        "quantity"        integer      NOT NULL DEFAULT 0,
        "unit"            varchar(50)  NOT NULL,
        "min_stock_level" integer      NOT NULL DEFAULT 0,
        "location"        varchar(255),
        "description"     text,
        "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_items"    PRIMARY KEY ("id"),
        CONSTRAINT "FK_items_category" FOREIGN KEY ("category_id")
          REFERENCES inventory_categories(id) ON DELETE RESTRICT
      )
    `);

    // damage_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "damage_reports" (
        "id"               uuid                   NOT NULL DEFAULT gen_random_uuid(),
        "item_id"          uuid                   NOT NULL,
        "quantity_damaged" integer                NOT NULL,
        "description"      text                   NOT NULL,
        "reported_by"      uuid                   NOT NULL,
        "status"           "damage_report_status" NOT NULL DEFAULT 'pending',
        "resolved_at"      TIMESTAMPTZ,
        "notes"            text,
        "created_at"       TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "PK_damage_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dr_item"        FOREIGN KEY ("item_id")
          REFERENCES inventory_items(id) ON DELETE CASCADE,
        CONSTRAINT "FK_dr_reporter"    FOREIGN KEY ("reported_by")
          REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "damage_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_sessions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "damage_report_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_target_group"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "attendance_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "session_type"`);
  }
}
