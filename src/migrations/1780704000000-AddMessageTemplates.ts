import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageTemplates1780704000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message_templates" (
        "id"         uuid         NOT NULL DEFAULT gen_random_uuid(),
        "name"       varchar(255) NOT NULL,
        "body"       text         NOT NULL,
        "created_by" uuid         NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_templates" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "message_templates"`);
  }
}
