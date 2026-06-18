import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppReleases1781470000000 implements MigrationInterface {
  name = 'CreateAppReleases1781470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "app_releases" (
      "id" SERIAL NOT NULL,
      "platform" character varying NOT NULL,
      "version" character varying(50) NOT NULL,
      "file_path" text NOT NULL,
      "file_name" character varying(255),
      "file_size" integer NOT NULL DEFAULT 0,
      "notes" text,
      "uploaded_by" integer,
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_app_releases" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_app_releases_platform" ON "app_releases" ("platform")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_releases"`);
  }
}
