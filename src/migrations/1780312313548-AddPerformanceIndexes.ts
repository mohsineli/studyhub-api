import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1780312313548 implements MigrationInterface {
    name = 'AddPerformanceIndexes1780312313548'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resources" DROP CONSTRAINT "FK_resources_uploader"`);
        await queryRunner.query(`ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_bookmarks_note"`);
        await queryRunner.query(`ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_bookmarks_resource"`);
        await queryRunner.query(`ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_bookmarks_user"`);
        await queryRunner.query(`ALTER TABLE "note_reactions" DROP CONSTRAINT "FK_note_reactions_note"`);
        await queryRunner.query(`ALTER TABLE "note_reactions" DROP CONSTRAINT "FK_note_reactions_user"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_notes_uploader"`);
        await queryRunner.query(`ALTER TABLE "review_likes" DROP CONSTRAINT "FK_review_likes_review"`);
        await queryRunner.query(`ALTER TABLE "review_likes" DROP CONSTRAINT "FK_review_likes_user"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_note"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_parent"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_user"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bookmarks_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bookmarks_user_note"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bookmarks_user_resource"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bookmarks_user_subject"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_note_reactions_note_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_review_likes_review_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_read"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pending_users_email"`);
        await queryRunner.query(`CREATE INDEX "idx_resources_uploader" ON "resources" ("uploader_id") `);
        await queryRunner.query(`CREATE INDEX "idx_resources_status" ON "resources" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_uploader" ON "notes" ("uploader_id") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_dept" ON "notes" ("dept") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_status" ON "notes" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users" ("role") `);
        await queryRunner.query(`CREATE INDEX "idx_users_points" ON "users" ("points") `);
        await queryRunner.query(`CREATE INDEX "idx_users_banned" ON "users" ("banned") `);
        await queryRunner.query(`CREATE INDEX "idx_users_last_active" ON "users" ("last_active_at") `);
        await queryRunner.query(`CREATE INDEX "idx_reviews_user" ON "reviews" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_reviews_note" ON "reviews" ("note_id") `);
        await queryRunner.query(`CREATE INDEX "idx_reviews_parent" ON "reviews" ("parent_id") `);
        await queryRunner.query(`CREATE INDEX "idx_sessions_user" ON "sessions" ("userId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_sessions_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_parent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_note"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_last_active"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_banned"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_points"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_role"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_dept"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_uploader"`);
        await queryRunner.query(`DROP INDEX "public"."idx_resources_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_resources_uploader"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_pending_users_email" ON "pending_users" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_user_read" ON "notifications" ("created_at", "is_read", "user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_review_likes_review_user" ON "review_likes" ("review_id", "user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_note_reactions_note_user" ON "note_reactions" ("note_id", "user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bookmarks_user_subject" ON "bookmarks" ("subject_name", "user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bookmarks_user_resource" ON "bookmarks" ("resource_id", "user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bookmarks_user_note" ON "bookmarks" ("note_id", "user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bookmarks_user" ON "bookmarks" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_parent" FOREIGN KEY ("parent_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review_likes" ADD CONSTRAINT "FK_review_likes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review_likes" ADD CONSTRAINT "FK_review_likes_review" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_notes_uploader" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "note_reactions" ADD CONSTRAINT "FK_note_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "note_reactions" ADD CONSTRAINT "FK_note_reactions_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_bookmarks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_bookmarks_resource" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_bookmarks_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resources" ADD CONSTRAINT "FK_resources_uploader" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
