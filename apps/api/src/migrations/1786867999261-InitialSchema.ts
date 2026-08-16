import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1786867999261 implements MigrationInterface {
    name = 'InitialSchema1786867999261'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "label" character varying NOT NULL, "streetText" character varying NOT NULL, "area" character varying NOT NULL, "zone" character varying NOT NULL, "lat" numeric(10,7) NOT NULL, "lng" numeric(10,7) NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."pickup_requests_status_enum" AS ENUM('PENDING', 'CLUSTERED', 'SCHEDULED', 'EN_ROUTE', 'COLLECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "pickup_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "addressId" uuid NOT NULL, "estimatedKg" numeric(10,2) NOT NULL, "note" character varying, "photoUrls" text array NOT NULL DEFAULT '{}', "status" "public"."pickup_requests_status_enum" NOT NULL DEFAULT 'PENDING', "cancelledReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a347837d7b9ff0c32e41951a6a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9678dbea53274c7ee2baec2bbe" ON "pickup_requests" ("status", "createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."wallet_transactions_type_enum" AS ENUM('CREDIT_COLLECTION', 'DEBIT_PAYOUT', 'ADJUSTMENT')`);
        await queryRunner.query(`CREATE TABLE "wallet_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "public"."wallet_transactions_type_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "balanceAfter" numeric(12,2) NOT NULL, "reference" character varying, "note" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4760946361d928decab5158603" ON "wallet_transactions" ("userId", "createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."payouts_method_enum" AS ENUM('BANK_TRANSFER', 'MOBILE_MONEY', 'CASH')`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum" AS ENUM('REQUESTED', 'APPROVED', 'PAID', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "method" "public"."payouts_method_enum" NOT NULL, "destinationDetails" jsonb NOT NULL DEFAULT '{}', "status" "public"."payouts_status_enum" NOT NULL DEFAULT 'REQUESTED', "processedById" uuid, "processedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('SUPPLIER', 'DRIVER', 'ADMIN')`);
        await queryRunner.query(`CREATE TYPE "public"."users_suppliertype_enum" AS ENUM('HOUSEHOLD', 'WASTE_PICKER', 'BUSINESS')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phone" character varying NOT NULL, "fullName" character varying NOT NULL, "passwordHash" character varying, "role" "public"."users_role_enum" NOT NULL, "supplierType" "public"."users_suppliertype_enum", "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "collections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "routeStopId" uuid NOT NULL, "actualKg" numeric(10,2) NOT NULL, "pricePerKg" numeric(12,2) NOT NULL DEFAULT '120', "amountPaid" numeric(12,2) NOT NULL, "collectedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "recordedById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_40ff346fed287377fb923cef5f7" UNIQUE ("routeStopId"), CONSTRAINT "REL_40ff346fed287377fb923cef5f" UNIQUE ("routeStopId"), CONSTRAINT "PK_21c00b1ebbd41ba1354242c5c4e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."route_stops_status_enum" AS ENUM('PENDING', 'ARRIVED', 'COLLECTED', 'SKIPPED')`);
        await queryRunner.query(`CREATE TABLE "route_stops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "routeId" uuid NOT NULL, "pickupRequestId" uuid NOT NULL, "stopOrder" integer NOT NULL, "status" "public"."route_stops_status_enum" NOT NULL DEFAULT 'PENDING', "skippedReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_22c09afc24c0a7a13644c629073" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."routes_status_enum" AS ENUM('DRAFT', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "routes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "zone" character varying NOT NULL, "scheduledDate" date NOT NULL, "status" "public"."routes_status_enum" NOT NULL DEFAULT 'DRAFT', "driverId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2b082c09c3de1ece6d324e8c85" ON "routes" ("scheduledDate") `);
        await queryRunner.query(`CREATE TYPE "public"."inventory_batches_status_enum" AS ENUM('RAW', 'SORTED', 'WASHED', 'COMPRESSED', 'ALLOCATED')`);
        await queryRunner.query(`CREATE TABLE "inventory_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "grossKg" numeric(10,2) NOT NULL, "processedKg" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."inventory_batches_status_enum" NOT NULL DEFAULT 'RAW', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1b670b7f687d8b8c58ef8d4629a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyerName" character varying NOT NULL DEFAULT 'Lagos off-taker', "totalKg" numeric(10,2) NOT NULL, "pricePerKg" numeric(12,2) NOT NULL DEFAULT '570', "revenue" numeric(12,2) NOT NULL, "allInCostPerKg" numeric(12,2) NOT NULL DEFAULT '450', "contribution" numeric(12,2) NOT NULL, "soldAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorId" uuid, "action" character varying NOT NULL, "entityType" character varying NOT NULL, "entityId" character varying NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "inventory_batch_collections" ("inventoryBatchId" uuid NOT NULL, "collectionId" uuid NOT NULL, CONSTRAINT "PK_6083cdb6a49af66f40b266dc33d" PRIMARY KEY ("inventoryBatchId", "collectionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0bd83e85723382d37223927f82" ON "inventory_batch_collections" ("inventoryBatchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e018d226bd87baf986a6bf2baf" ON "inventory_batch_collections" ("collectionId") `);
        await queryRunner.query(`CREATE TABLE "sale_batches" ("saleId" uuid NOT NULL, "inventoryBatchId" uuid NOT NULL, CONSTRAINT "PK_414119953900aa7df685cff28c1" PRIMARY KEY ("saleId", "inventoryBatchId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1060a02b4d1d5098cc06e29398" ON "sale_batches" ("saleId") `);
        await queryRunner.query(`CREATE INDEX "IDX_75949610046b2cd40b65f4d090" ON "sale_batches" ("inventoryBatchId") `);
        await queryRunner.query(`ALTER TABLE "addresses" ADD CONSTRAINT "FK_95c93a584de49f0b0e13f753630" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup_requests" ADD CONSTRAINT "FK_9c5906ba747ca96264a55f70b26" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup_requests" ADD CONSTRAINT "FK_6d171653236810a0215ce21e7cd" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_69454773f1e666a14c6a9539353" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_815d7904b1dbea552a57247bebf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_df8541550cc27d08b7dd991843f" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collections" ADD CONSTRAINT "FK_40ff346fed287377fb923cef5f7" FOREIGN KEY ("routeStopId") REFERENCES "route_stops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collections" ADD CONSTRAINT "FK_522ec3c86f44655af89afd0e8f1" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_stops" ADD CONSTRAINT "FK_352e45964a86c097a435f643004" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_stops" ADD CONSTRAINT "FK_1d77f74c9fc673bad59213b6bb2" FOREIGN KEY ("pickupRequestId") REFERENCES "pickup_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "routes" ADD CONSTRAINT "FK_2b32f218055ee12894887aa05cc" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_2dc33f7f3c22e2e7badafca1d12" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_batch_collections" ADD CONSTRAINT "FK_0bd83e85723382d37223927f820" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "inventory_batch_collections" ADD CONSTRAINT "FK_e018d226bd87baf986a6bf2bafd" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "sale_batches" ADD CONSTRAINT "FK_1060a02b4d1d5098cc06e29398e" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "sale_batches" ADD CONSTRAINT "FK_75949610046b2cd40b65f4d090e" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale_batches" DROP CONSTRAINT "FK_75949610046b2cd40b65f4d090e"`);
        await queryRunner.query(`ALTER TABLE "sale_batches" DROP CONSTRAINT "FK_1060a02b4d1d5098cc06e29398e"`);
        await queryRunner.query(`ALTER TABLE "inventory_batch_collections" DROP CONSTRAINT "FK_e018d226bd87baf986a6bf2bafd"`);
        await queryRunner.query(`ALTER TABLE "inventory_batch_collections" DROP CONSTRAINT "FK_0bd83e85723382d37223927f820"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_2dc33f7f3c22e2e7badafca1d12"`);
        await queryRunner.query(`ALTER TABLE "routes" DROP CONSTRAINT "FK_2b32f218055ee12894887aa05cc"`);
        await queryRunner.query(`ALTER TABLE "route_stops" DROP CONSTRAINT "FK_1d77f74c9fc673bad59213b6bb2"`);
        await queryRunner.query(`ALTER TABLE "route_stops" DROP CONSTRAINT "FK_352e45964a86c097a435f643004"`);
        await queryRunner.query(`ALTER TABLE "collections" DROP CONSTRAINT "FK_522ec3c86f44655af89afd0e8f1"`);
        await queryRunner.query(`ALTER TABLE "collections" DROP CONSTRAINT "FK_40ff346fed287377fb923cef5f7"`);
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_df8541550cc27d08b7dd991843f"`);
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_815d7904b1dbea552a57247bebf"`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_69454773f1e666a14c6a9539353"`);
        await queryRunner.query(`ALTER TABLE "pickup_requests" DROP CONSTRAINT "FK_6d171653236810a0215ce21e7cd"`);
        await queryRunner.query(`ALTER TABLE "pickup_requests" DROP CONSTRAINT "FK_9c5906ba747ca96264a55f70b26"`);
        await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT "FK_95c93a584de49f0b0e13f753630"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_75949610046b2cd40b65f4d090"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1060a02b4d1d5098cc06e29398"`);
        await queryRunner.query(`DROP TABLE "sale_batches"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e018d226bd87baf986a6bf2baf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0bd83e85723382d37223927f82"`);
        await queryRunner.query(`DROP TABLE "inventory_batch_collections"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`DROP TABLE "inventory_batches"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_batches_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b082c09c3de1ece6d324e8c85"`);
        await queryRunner.query(`DROP TABLE "routes"`);
        await queryRunner.query(`DROP TYPE "public"."routes_status_enum"`);
        await queryRunner.query(`DROP TABLE "route_stops"`);
        await queryRunner.query(`DROP TYPE "public"."route_stops_status_enum"`);
        await queryRunner.query(`DROP TABLE "collections"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_suppliertype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "payouts"`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payouts_method_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4760946361d928decab5158603"`);
        await queryRunner.query(`DROP TABLE "wallet_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_transactions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9678dbea53274c7ee2baec2bbe"`);
        await queryRunner.query(`DROP TABLE "pickup_requests"`);
        await queryRunner.query(`DROP TYPE "public"."pickup_requests_status_enum"`);
        await queryRunner.query(`DROP TABLE "addresses"`);
    }

}
