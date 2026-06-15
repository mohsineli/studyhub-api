import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFollows1781400000000 implements MigrationInterface {
  name = 'CreateFollows1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "follows" (
      "id" SERIAL NOT NULL,
      "follower_id" integer NOT NULL,
      "following_id" integer NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_follows" PRIMARY KEY ("id"),
      CONSTRAINT "unique_follow" UNIQUE ("follower_id", "following_id"),
      CONSTRAINT "chk_follow_not_self" CHECK ("follower_id" <> "following_id")
    )`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_follow_follower" ON "follows" ("follower_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_follow_following" ON "follows" ("following_id")`);

    await queryRunner.query(`DO $$ BEGIN
      ALTER TABLE "follows" ADD CONSTRAINT "FK_follows_follower"
        FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await queryRunner.query(`DO $$ BEGIN
      ALTER TABLE "follows" ADD CONSTRAINT "FK_follows_following"
        FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "follows"`);
  }
}
