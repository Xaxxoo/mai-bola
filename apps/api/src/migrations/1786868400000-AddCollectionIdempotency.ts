import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollectionIdempotency1786868400000 implements MigrationInterface {
  name = 'AddCollectionIdempotency1786868400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "collections" ADD "idempotencyKey" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_collections_idempotency_key" ON "collections" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_collections_idempotency_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collections" DROP COLUMN "idempotencyKey"`,
    );
  }
}
