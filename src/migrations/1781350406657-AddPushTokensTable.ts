import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPushTokensTable1781350406657 implements MigrationInterface {
    name = 'AddPushTokensTable1781350406657'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "push_tokens" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "token" character varying(255) NOT NULL, "platform" character varying(20) NOT NULL DEFAULT 'ios', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_32734e87f299c29ca3878861f4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_push_tokens_user" ON "push_tokens" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_94c371aff70dedeb89dae39f440" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_94c371aff70dedeb89dae39f440"`);
        await queryRunner.query(`DROP INDEX "public"."idx_push_tokens_user"`);
        await queryRunner.query(`DROP TABLE "push_tokens"`);
    }

}
