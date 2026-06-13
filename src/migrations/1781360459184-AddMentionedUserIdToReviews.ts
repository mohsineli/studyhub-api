import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMentionedUserIdToReviews1781360459184 implements MigrationInterface {
    name = 'AddMentionedUserIdToReviews1781360459184'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" ADD "mentioned_user_id" integer`);
        await queryRunner.query(`CREATE INDEX "idx_reviews_mentioned_user" ON "reviews" ("mentioned_user_id") `);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_76b3e5b476a7e9353e2ac0daf05" FOREIGN KEY ("mentioned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_76b3e5b476a7e9353e2ac0daf05"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_mentioned_user"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "mentioned_user_id"`);
    }

}
