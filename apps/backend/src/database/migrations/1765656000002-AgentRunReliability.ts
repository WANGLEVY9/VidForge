import { MigrationInterface, QueryRunner } from 'typeorm';

/** Add idempotency and worker lease metadata without changing existing runs. */
export class AgentRunReliability1765656000002 implements MigrationInterface {
  name = 'AgentRunReliability1765656000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "idempotencyKey" character varying(200)'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "attempt" integer NOT NULL DEFAULT 0'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "workerId" character varying(160)'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "leaseUntil" TIMESTAMP'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "heartbeatAt" TIMESTAMP'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "graphThreadId" character varying(220)'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "checkpointId" character varying(220)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_runs_user_idempotency" ON "agent_runs" ("userId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_agent_runs_lease" ON "agent_runs" ("status", "leaseUntil")'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_agent_runs_lease"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_agent_runs_user_idempotency"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "checkpointId"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "graphThreadId"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "heartbeatAt"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "leaseUntil"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "workerId"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "attempt"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "idempotencyKey"');
  }
}
