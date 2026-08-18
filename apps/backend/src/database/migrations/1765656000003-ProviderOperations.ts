import { MigrationInterface, QueryRunner } from 'typeorm';

/** Durable, idempotent audit ledger for external Agent provider operations. */
export class ProviderOperations1765656000003 implements MigrationInterface {
  name = 'ProviderOperations1765656000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_operations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "runId" character varying(220) NOT NULL,
        "nodeName" character varying(120) NOT NULL,
        "provider" character varying(80) NOT NULL,
        "capability" character varying(80) NOT NULL,
        "idempotencyKey" character varying(220) NOT NULL,
        "requestHash" character varying(64) NOT NULL,
        "remoteOperationId" character varying(500),
        "status" character varying NOT NULL DEFAULT 'pending',
        "attempt" integer NOT NULL DEFAULT 0,
        "requestMetadata" json,
        "resultMetadata" json,
        "errorMessage" text,
        "dispatchedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_operations_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_provider_operations_provider_key" ON "provider_operations" ("provider", "idempotencyKey")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_provider_operations_run_user" ON "provider_operations" ("runId", "userId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_provider_operations_status" ON "provider_operations" ("status", "updatedAt")'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "provider_operations"');
  }
}
