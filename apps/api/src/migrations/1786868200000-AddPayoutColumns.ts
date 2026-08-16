import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutColumns1786868200000 implements MigrationInterface {
  name = 'AddPayoutColumns1786868200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD "rejectedReason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD "paidReference" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP COLUMN "paidReference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP COLUMN "rejectedReason"`,
    );
  }
}
