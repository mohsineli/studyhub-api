import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBestRankToUsers1781450000000 implements MigrationInterface {
  name = 'AddBestRankToUsers1781450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "best_rank" integer`);
    await queryRunner.query(`ALTER TABLE "users" ADD "best_rank_month" integer`);
    await queryRunner.query(`ALTER TABLE "users" ADD "best_rank_year" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "best_rank"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "best_rank_month"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "best_rank_year"`);
  }
}
