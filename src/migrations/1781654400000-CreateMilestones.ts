import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C5c: spiritual milestone tracking. milestone_types is admin-editable (not
 * a hardcoded enum) since the specific milestones a church tracks — baptism,
 * discipleship classes, leadership training, etc. — are a church-specific
 * decision, not one this codebase should make. Seeded with a handful of
 * common starting examples that can be renamed or removed.
 */
export class CreateMilestones1781654400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "milestone_types" (
        "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
        "name"        varchar(100) NOT NULL,
        "description" text,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_milestone_types_name" UNIQUE ("name"),
        CONSTRAINT "PK_milestone_types"      PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "member_milestones" (
        "id"                uuid        NOT NULL DEFAULT gen_random_uuid(),
        "member_id"         uuid        NOT NULL,
        "milestone_type_id" uuid        NOT NULL,
        "achieved_at"       date        NOT NULL DEFAULT CURRENT_DATE,
        "notes"             text,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_member_milestones" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mm_member" FOREIGN KEY ("member_id")
          REFERENCES members(id) ON DELETE CASCADE,
        CONSTRAINT "FK_mm_milestone_type" FOREIGN KEY ("milestone_type_id")
          REFERENCES milestone_types(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_member_milestones_member"
        ON "member_milestones" ("member_id")
    `);

    await queryRunner.query(`
      INSERT INTO "milestone_types" ("name", "description") VALUES
        ('Baptism', 'Water baptism'),
        ('Discipleship Class Completed', 'Completed the church''s discipleship / new-member class'),
        ('Leadership Training', 'Completed leadership or ministry training')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "member_milestones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "milestone_types"`);
  }
}
