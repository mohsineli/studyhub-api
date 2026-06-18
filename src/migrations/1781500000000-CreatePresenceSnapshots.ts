import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePresenceSnapshots1781500000000 implements MigrationInterface {
  name = 'CreatePresenceSnapshots1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "presence_snapshots" (
      "id" SERIAL NOT NULL,
      "total" integer NOT NULL DEFAULT 0,
      "web" integer NOT NULL DEFAULT 0,
      "android" integer NOT NULL DEFAULT 0,
      "ios" integer NOT NULL DEFAULT 0,
      "app" integer NOT NULL DEFAULT 0,
      "captured_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_presence_snapshots" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_presence_snapshots_captured" ON "presence_snapshots" ("captured_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "presence_snapshots"`);
  }
}
