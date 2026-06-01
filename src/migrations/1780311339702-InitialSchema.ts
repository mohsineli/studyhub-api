import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1780311339702 implements MigrationInterface {
  name = 'InitialSchema1780311339702';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums — wrapped in PL/pgSQL DO blocks to survive transaction rollback on re-run
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "users_role_enum" AS ENUM ('student', 'admin', 'moderator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "notes_status_enum" AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "pending_users_role_enum" AS ENUM ('student', 'admin', 'moderator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "resources_status_enum" AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "resources_term_enum" AS ENUM ('mid', 'final'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    // Tables
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" (
      "id" SERIAL NOT NULL,
      "name" character varying(255) NOT NULL,
      "email" character varying(255) NOT NULL,
      "password" character varying(255) NOT NULL,
      "role" "users_role_enum" NOT NULL DEFAULT 'student',
      "points" integer NOT NULL DEFAULT 0,
      "verified" boolean NOT NULL DEFAULT false,
      "banned" boolean NOT NULL DEFAULT false,
      "dept" character varying(255),
      "code" character varying(255),
      "profile_pic" text,
      "otp" character varying(6),
      "otp_expires_at" timestamp,
      "last_active_at" timestamp,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "github" character varying(255),
      "linkedin" character varying(255),
      "instagram" character varying(255),
      "facebook" character varying(255),
      "preferred_theme" character varying(10) NOT NULL DEFAULT 'dark',
      CONSTRAINT "PK_users" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "pending_users" (
      "id" SERIAL NOT NULL,
      "name" character varying(255) NOT NULL,
      "email" character varying(255) NOT NULL,
      "password" character varying(255) NOT NULL,
      "role" "pending_users_role_enum" NOT NULL DEFAULT 'student',
      "otp" character varying(6) NOT NULL,
      "otp_expires_at" timestamp NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_pending_users" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "settings" (
      "key" character varying(50) NOT NULL,
      "value" text,
      CONSTRAINT "PK_settings" PRIMARY KEY ("key")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notes" (
      "id" SERIAL NOT NULL,
      "uploader_id" integer NOT NULL,
      "title" character varying(255) NOT NULL,
      "description" text,
      "courseTitle" character varying(100) NOT NULL,
      "code" character varying(50) NOT NULL,
      "dept" character varying(100) NOT NULL,
      "file_path" text NOT NULL,
      "file_type" character varying(20) NOT NULL,
      "avg_rating" numeric(3,2) NOT NULL DEFAULT 0,
      "status" "notes_status_enum" NOT NULL DEFAULT 'pending',
      "downloads" integer NOT NULL DEFAULT 0,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "total_ratings" integer NOT NULL DEFAULT 0,
      CONSTRAINT "PK_notes" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sessions" (
      "id" SERIAL NOT NULL,
      "refresh_token" text NOT NULL,
      "user_agent" text,
      "ip_address" text,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "userId" integer NOT NULL,
      CONSTRAINT "PK_sessions" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "reviews" (
      "id" SERIAL NOT NULL,
      "user_id" integer NOT NULL,
      "note_id" integer NOT NULL,
      "rating" integer NOT NULL,
      "comment" text,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp DEFAULT now(),
      "parent_id" integer,
      "likes_count" integer NOT NULL DEFAULT 0,
      "dislikes_count" integer NOT NULL DEFAULT 0,
      CONSTRAINT "PK_reviews" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "resources" (
      "id" SERIAL NOT NULL,
      "uploader_id" integer,
      "title" character varying(255) NOT NULL,
      "description" text,
      "subject" character varying(100),
      "course_code" character varying(50),
      "term" "resources_term_enum",
      "file_path" character varying(255) NOT NULL,
      "file_type" character varying(20),
      "avg_rating" numeric(3,2) NOT NULL DEFAULT 0,
      "downloads" integer NOT NULL DEFAULT 0,
      "status" "resources_status_enum" NOT NULL DEFAULT 'pending',
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_resources" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "bookmarks" (
      "id" SERIAL NOT NULL,
      "user_id" integer NOT NULL,
      "note_id" integer,
      "resource_id" integer,
      "subject_name" character varying(255),
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_bookmarks" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "note_reactions" (
      "id" SERIAL NOT NULL,
      "note_id" integer NOT NULL,
      "user_id" integer NOT NULL,
      "reaction" character varying(10) NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_note_reactions" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "review_likes" (
      "id" SERIAL NOT NULL,
      "review_id" integer NOT NULL,
      "user_id" integer NOT NULL,
      "type" character varying(10) NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_review_likes" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notifications" (
      "id" SERIAL NOT NULL,
      "user_id" integer NOT NULL,
      "actor_id" integer,
      "type" character varying(50) NOT NULL,
      "title" character varying(255) NOT NULL,
      "message" text,
      "entity_type" character varying(50) NOT NULL,
      "entity_id" integer,
      "redirect_url" text,
      "is_read" boolean NOT NULL DEFAULT false,
      "metadata" jsonb,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "read_at" timestamp,
      CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
    )`);

    // Indexes — drop first to avoid duplicates on re-run
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookmarks_user"`);
    await queryRunner.query(`CREATE INDEX "IDX_bookmarks_user" ON "bookmarks" ("user_id")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookmarks_user_note"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bookmarks_user_note" ON "bookmarks" ("user_id", "note_id")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookmarks_user_resource"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bookmarks_user_resource" ON "bookmarks" ("user_id", "resource_id")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookmarks_user_subject"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bookmarks_user_subject" ON "bookmarks" ("user_id", "subject_name")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_note_reactions_note_user"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_note_reactions_note_user" ON "note_reactions" ("note_id", "user_id")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_review_likes_review_user"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_review_likes_review_user" ON "review_likes" ("review_id", "user_id")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_read"`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user_read" ON "notifications" ("user_id", "is_read", "created_at")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pending_users_email"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_pending_users_email" ON "pending_users" ("email")`);

    // Foreign keys — drop then add to handle re-runs
    const fks = [
      ['FK_notes_uploader', '"notes"', 'ALTER TABLE "notes" ADD CONSTRAINT "FK_notes_uploader" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE'],
      ['FK_sessions_user', '"sessions"', 'ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE'],
      ['FK_reviews_user', '"reviews"', 'ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE'],
      ['FK_reviews_note', '"reviews"', 'ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE'],
      ['FK_reviews_parent', '"reviews"', 'ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_parent" FOREIGN KEY ("parent_id") REFERENCES "reviews"("id") ON DELETE CASCADE'],
      ['FK_resources_uploader', '"resources"', 'ALTER TABLE "resources" ADD CONSTRAINT "FK_resources_uploader" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE SET NULL'],
      ['FK_bookmarks_user', '"bookmarks"', 'ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_bookmarks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE'],
      ['FK_bookmarks_note', '"bookmarks"', 'ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_bookmarks_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE'],
      ['FK_bookmarks_resource', '"bookmarks"', 'ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_bookmarks_resource" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE'],
      ['FK_note_reactions_note', '"note_reactions"', 'ALTER TABLE "note_reactions" ADD CONSTRAINT "FK_note_reactions_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE'],
      ['FK_note_reactions_user', '"note_reactions"', 'ALTER TABLE "note_reactions" ADD CONSTRAINT "FK_note_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE'],
      ['FK_review_likes_review', '"review_likes"', 'ALTER TABLE "review_likes" ADD CONSTRAINT "FK_review_likes_review" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE'],
      ['FK_review_likes_user', '"review_likes"', 'ALTER TABLE "review_likes" ADD CONSTRAINT "FK_review_likes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE'],
    ];

    for (const [name, table, sql] of fks) {
      await queryRunner.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS "${name}"`);
      await queryRunner.query(`DO $$ BEGIN ${sql.replace(/`/g, '')}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "review_likes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "note_reactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookmarks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resources" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pending_users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notes_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pending_users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "resources_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "resources_term_enum"`);
  }
}
