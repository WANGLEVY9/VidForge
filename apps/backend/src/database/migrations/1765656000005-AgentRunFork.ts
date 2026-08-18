import { MigrationInterface, QueryRunner } from 'typeorm';

/** Add explicit parent linkage for checkpoint-derived Agent runs. */
export class AgentRunFork1765656000005 implements MigrationInterface {
  name = 'AgentRunFork1765656000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "parentRunId" character varying(220)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_agent_runs_parent" ON "agent_runs" ("parentRunId")'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_agent_runs_parent"');
    await queryRunner.query('ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "parentRunId"');
  }
}
