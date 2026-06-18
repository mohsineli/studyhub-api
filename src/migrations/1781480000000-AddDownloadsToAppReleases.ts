import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDownloadsToAppReleases1781480000000 implements MigrationInterface {
  name = 'AddDownloadsToAppReleases1781480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_releases" ADD COLUMN IF NOT EXISTS "downloads" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app_releases" DROP COLUMN IF EXISTS "downloads"`);
  }
}
