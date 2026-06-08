import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRejectedAtToNotes1780914740824 implements MigrationInterface {
    name = 'AddRejectedAtToNotes1780914740824'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notes" ADD "rejected_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "bookmarks" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "note_reactions" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "notes" ALTER COLUMN "file_path" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notes" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "review_likes" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "read_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "read_at" text`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "metadata" text`);
        await queryRunner.query(`ALTER TABLE "pending_users" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "idx_notes_rejected_at" ON "notes" ("rejected_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_notes_rejected_at"`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "pending_users" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "metadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "read_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "read_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "review_likes" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "notes" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "notes" ALTER COLUMN "file_path" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "note_reactions" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "bookmarks" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "created_at" SET DEFAULT ('now'::text)::timestamp(6) with time zone`);
        await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "rejected_at"`);
    }

}
