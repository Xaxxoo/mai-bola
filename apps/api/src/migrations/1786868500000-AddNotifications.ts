import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1786868500000 implements MigrationInterface {
  name = 'AddNotifications1786868500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_type_enum" AS ENUM ('PICKUP_SCHEDULED', 'COLLECTION_CREDITED', 'PAYOUT_STATUS_CHANGED')`);
    await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "notification_type_enum" NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "data" jsonb NOT NULL DEFAULT '{}', "readAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE TABLE "push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh" text NOT NULL, "auth" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_push_subscriptions_user_endpoint" ON "push_subscriptions" ("userId", "endpoint")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_push_subscriptions_user_endpoint"`);
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_created"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
