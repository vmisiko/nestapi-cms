import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C5b: who oversees a fellowship zone. Mirrors fellowships.leader_id exactly
 * -- a nullable, deferred FK to members, set null (not cascaded) if the
 * member is removed.
 */
export class AddZoneOverseer1781568000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fellowship_zones"
        ADD COLUMN IF NOT EXISTS "overseer_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "fellowship_zones"
        ADD CONSTRAINT "FK_fellowship_zones_overseer"
        FOREIGN KEY ("overseer_id") REFERENCES members(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fellowship_zones_overseer_id"
        ON "fellowship_zones" ("overseer_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_fellowship_zones_overseer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fellowship_zones" DROP CONSTRAINT IF EXISTS "FK_fellowship_zones_overseer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fellowship_zones" DROP COLUMN IF EXISTS "overseer_id"`,
    );
  }
}
