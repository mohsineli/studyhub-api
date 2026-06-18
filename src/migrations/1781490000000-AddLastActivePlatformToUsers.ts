import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastActivePlatformToUsers1781490000000 implements MigrationInterface {
  name = 'AddLastActivePlatformToUsers1781490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active_platform" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_active_platform"`);
  }
}
