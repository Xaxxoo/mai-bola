import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsTable1786868300000 implements MigrationInterface {
  name = 'AddSettingsTable1786868300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "buyPricePerKg" numeric(12,2) NOT NULL DEFAULT 120,
        "sellPricePerKg" numeric(12,2) NOT NULL DEFAULT 570,
        "allInCostPerKg" numeric(12,2) NOT NULL DEFAULT 450,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_settings" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "settings" ("buyPricePerKg", "sellPricePerKg", "allInCostPerKg") VALUES (120, 570, 450)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "settings"`);
  }
}
