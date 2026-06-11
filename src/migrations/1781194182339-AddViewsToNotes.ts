import { MigrationInterface, QueryRunner } from "typeorm";

export class AddViewsToNotes1781194182339 implements MigrationInterface {
    name = 'AddViewsToNotes1781194182339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notes" ADD "views" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "views"`);
    }
}
