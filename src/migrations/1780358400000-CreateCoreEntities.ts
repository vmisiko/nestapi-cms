import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreEntities1780358400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "member_status"   AS ENUM ('guest', 'member', 'leader');
        CREATE TYPE "member_type"     AS ENUM ('adult', 'child');
        CREATE TYPE "activity_status" AS ENUM ('active', 'inactive');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // fellowship_zones
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fellowship_zones" (
        "id"         uuid         NOT NULL DEFAULT gen_random_uuid(),
        "name"       varchar(100) NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_fellowship_zones_name" UNIQUE ("name"),
        CONSTRAINT "PK_fellowship_zones"      PRIMARY KEY ("id")
      )
    `);

    // Seed the 6 standard zones
    await queryRunner.query(`
      INSERT INTO fellowship_zones (name) VALUES
        ('Waiyaki Way Zone'),
        ('Thika Road Zone'),
        ('Southern Bypass Zone'),
        ('Mombasa Road Zone'),
        ('Lang''ata Road Zone'),
        ('Outer Ring Road Zone')
      ON CONFLICT (name) DO NOTHING
    `);

    // departments (no FK to members yet — head_id added as nullable)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id"            uuid           NOT NULL DEFAULT gen_random_uuid(),
        "name"          varchar(100)   NOT NULL,
        "head_id"       uuid,
        "member_target" integer        NOT NULL DEFAULT 0,
        "annual_budget" numeric(12,2)  NOT NULL DEFAULT 0,
        "budget_spent"  numeric(12,2)  NOT NULL DEFAULT 0,
        "description"   text,
        "created_at"    TIMESTAMPTZ    NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departments" PRIMARY KEY ("id")
      )
    `);

    // fellowships (leader_id FK deferred — resolves circular with members)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fellowships" (
        "id"           uuid             NOT NULL DEFAULT gen_random_uuid(),
        "name"         varchar(150)     NOT NULL,
        "slug"         varchar(150)     NOT NULL,
        "zone_id"      uuid             NOT NULL,
        "leader_id"    uuid,
        "meeting_day"  varchar(20)      NOT NULL,
        "meeting_time" time             NOT NULL,
        "location"     varchar(255)     NOT NULL,
        "status"       "activity_status" NOT NULL DEFAULT 'active',
        "description"  text,
        "created_at"   TIMESTAMPTZ      NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ      NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_fellowships_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_fellowships"      PRIMARY KEY ("id"),
        CONSTRAINT "FK_fellowships_zone" FOREIGN KEY ("zone_id")
          REFERENCES fellowship_zones(id) ON DELETE RESTRICT
      )
    `);

    // members
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "members" (
        "id"              uuid             NOT NULL DEFAULT gen_random_uuid(),
        "first_name"      varchar(100)     NOT NULL,
        "last_name"       varchar(100)     NOT NULL,
        "phone"           varchar(30),
        "email"           varchar(255),
        "status"          "member_status"  NOT NULL DEFAULT 'guest',
        "fellowship_id"   uuid,
        "member_type"     "member_type"    NOT NULL DEFAULT 'adult',
        "activity_status" "activity_status" NOT NULL DEFAULT 'active',
        "joined_at"       date             NOT NULL DEFAULT CURRENT_DATE,
        "avatar_url"      varchar(500),
        "created_at"      TIMESTAMPTZ      NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ      NOT NULL DEFAULT now(),
        CONSTRAINT "PK_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_members_fellowship" FOREIGN KEY ("fellowship_id")
          REFERENCES fellowships(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
      )
    `);

    // Unique partial index on email
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_members_email"
        ON members(email) WHERE email IS NOT NULL
    `);

    // Now add deferred FKs for circular refs
    await queryRunner.query(`
      ALTER TABLE fellowships
        ADD CONSTRAINT "FK_fellowships_leader"
        FOREIGN KEY ("leader_id") REFERENCES members(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
    `);
    await queryRunner.query(`
      ALTER TABLE departments
        ADD CONSTRAINT "FK_departments_head"
        FOREIGN KEY ("head_id") REFERENCES members(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
    `);

    // member_departments junction
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "member_departments" (
        "id"            uuid         NOT NULL DEFAULT gen_random_uuid(),
        "member_id"     uuid         NOT NULL,
        "department_id" uuid         NOT NULL,
        "role"          varchar(100),
        "joined_at"     date         NOT NULL DEFAULT CURRENT_DATE,
        CONSTRAINT "PK_member_departments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_member_dept" UNIQUE ("member_id", "department_id"),
        CONSTRAINT "FK_md_member"     FOREIGN KEY ("member_id")     REFERENCES members(id)     ON DELETE CASCADE,
        CONSTRAINT "FK_md_department" FOREIGN KEY ("department_id") REFERENCES departments(id) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "member_departments"`);
    await queryRunner.query(
      `ALTER TABLE fellowships DROP CONSTRAINT IF EXISTS "FK_fellowships_leader"`,
    );
    await queryRunner.query(
      `ALTER TABLE departments DROP CONSTRAINT IF EXISTS "FK_departments_head"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fellowships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fellowship_zones"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "activity_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "member_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "member_status"`);
  }
}
