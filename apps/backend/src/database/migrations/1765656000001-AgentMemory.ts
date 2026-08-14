import { MigrationInterface, QueryRunner } from 'typeorm';

/** Persistent, tenant-scoped memory for agent preferences and run learnings. */
export class AgentMemory1765656000001 implements MigrationInterface {
  name = 'AgentMemory1765656000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_memories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "productSpaceId" character varying,
        "sourceRunId" character varying,
        "scope" character varying NOT NULL DEFAULT 'product_space',
        "kind" character varying NOT NULL DEFAULT 'fact',
        "semanticKey" character varying(220) NOT NULL,
        "content" text NOT NULL,
        "metadata" json,
        "importance" double precision NOT NULL DEFAULT 0.5,
        "accessCount" integer NOT NULL DEFAULT 0,
        "lastAccessedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_memories_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_memories_userId_semanticKey" ON "agent_memories" ("userId", "semanticKey")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_agent_memories_userId_productSpaceId" ON "agent_memories" ("userId", "productSpaceId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_agent_memories_userId_kind" ON "agent_memories" ("userId", "kind")'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "agent_memories"');
  }
}
