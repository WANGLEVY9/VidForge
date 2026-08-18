import { MigrationInterface, QueryRunner } from 'typeorm';

/** Durable dispatch boundary between AgentRun writes and BullMQ. */
export class AgentOutbox1765656000004 implements MigrationInterface {
  name = 'AgentOutbox1765656000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_outbox_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventType" character varying(80) NOT NULL,
        "aggregateId" character varying(220) NOT NULL,
        "dedupeKey" character varying(160) NOT NULL,
        "payload" json NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "availableAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lockedAt" TIMESTAMP,
        "lockedBy" character varying(160),
        "dispatchedAt" TIMESTAMP,
        "lastError" character varying(500),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_agent_outbox_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agent_outbox_events_dedupe" UNIQUE ("dedupeKey")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_agent_outbox_ready" ON "agent_outbox_events" ("status", "availableAt")'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_agent_outbox_ready"');
    await queryRunner.query('DROP TABLE IF EXISTS "agent_outbox_events"');
  }
}
