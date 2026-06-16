import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBestRankPointsToUsers1781460000000 implements MigrationInterface {
  name = 'AddBestRankPointsToUsers1781460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "best_rank_points" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "best_rank_points"`);
  }
}
