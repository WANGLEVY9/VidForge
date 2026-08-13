import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema baseline for databases that previously relied on
 * synchronize=true. Every statement is idempotent so an existing deployment
 * can adopt migrations without dropping data.
 */
export class InitialSchema1765656000000 implements MigrationInterface {
  name = 'InitialSchema1765656000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "username" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "avatarUrl" character varying,
        "bio" text,
        "role" character varying NOT NULL DEFAULT 'user',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_unique" ON "users" ("email")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_spaces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "productName" character varying,
        "category" character varying,
        "coverUrl" character varying,
        "knowledge" json,
        "isDefault" boolean NOT NULL DEFAULT false,
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_spaces_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_product_spaces_userId" ON "product_spaces" ("userId")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "materials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying,
        "productSpaceId" character varying,
        "name" character varying NOT NULL,
        "type" character varying NOT NULL,
        "url" character varying,
        "thumbnailUrl" character varying,
        "size" integer,
        "tags" text,
        "productTags" json,
        "videoTags" json,
        "clipTags" json,
        "category" character varying,
        "metadata" json,
        "embedding" vector(1024),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_materials_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_materials_userId" ON "materials" ("userId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_materials_productSpaceId" ON "materials" ("productSpaceId")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scripts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying,
        "productSpaceId" character varying,
        "parentScriptId" character varying,
        "version" integer NOT NULL DEFAULT 1,
        "title" character varying NOT NULL,
        "productName" character varying NOT NULL,
        "category" character varying NOT NULL,
        "sellingPoints" text NOT NULL,
        "targetAudience" character varying,
        "style" character varying NOT NULL DEFAULT 'professional',
        "storyboard" json NOT NULL,
        "voiceover" character varying,
        "bgmSuggestion" character varying,
        "tags" text,
        "duration" integer NOT NULL DEFAULT 45,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scripts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_scripts_userId" ON "scripts" ("userId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_scripts_productSpaceId" ON "scripts" ("productSpaceId")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "creation_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying,
        "productSpaceId" character varying,
        "title" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "storyboard" json,
        "progress" integer,
        "result" json,
        "errorMessage" character varying,
        "scriptId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_creation_tasks_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_creation_tasks_userId" ON "creation_tasks" ("userId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_creation_tasks_productSpaceId" ON "creation_tasks" ("productSpaceId")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_runs" (
        "id" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "currentNode" character varying NOT NULL DEFAULT '',
        "progress" integer NOT NULL DEFAULT 0,
        "input" json NOT NULL,
        "result" json,
        "errorMessage" character varying,
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_runs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_agent_runs_userId" ON "agent_runs" ("userId")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trace_spans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying,
        "taskId" character varying NOT NULL,
        "scope" character varying NOT NULL,
        "span" character varying NOT NULL,
        "startedAt" TIMESTAMP NOT NULL,
        "endedAt" TIMESTAMP NOT NULL,
        "latencyMs" integer NOT NULL,
        "status" character varying NOT NULL DEFAULT 'ok',
        "summary" text,
        "errorMessage" text,
        "model" character varying,
        "promptTokens" integer NOT NULL DEFAULT 0,
        "completionTokens" integer NOT NULL DEFAULT 0,
        "costCents" double precision,
        "cacheHit" boolean NOT NULL DEFAULT false,
        "metadata" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trace_spans_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_trace_spans_userId" ON "trace_spans" ("userId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_trace_spans_taskId" ON "trace_spans" ("taskId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_trace_spans_scope" ON "trace_spans" ("scope")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_trace_spans_span" ON "trace_spans" ("span")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_trace_spans_status" ON "trace_spans" ("status")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "export_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying,
        "productSpaceId" character varying,
        "creationTaskId" character varying NOT NULL,
        "format" character varying NOT NULL DEFAULT 'mp4',
        "resolution" character varying NOT NULL DEFAULT '1080p',
        "status" character varying NOT NULL DEFAULT 'pending',
        "progress" integer,
        "outputUrl" character varying,
        "fileSize" integer,
        "errorMessage" character varying,
        "options" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_export_tasks_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_export_tasks_userId" ON "export_tasks" ("userId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_export_tasks_productSpaceId" ON "export_tasks" ("productSpaceId")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "type" character varying(32) NOT NULL DEFAULT 'system',
        "title" character varying(200) NOT NULL,
        "content" text NOT NULL,
        "link" character varying(500),
        "read" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON "notifications" ("userId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_notifications_type" ON "notifications" ("type")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_notifications_read" ON "notifications" ("read")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "category" character varying NOT NULL,
        "style" character varying NOT NULL DEFAULT 'professional',
        "shots" json NOT NULL,
        "voiceover" character varying,
        "bgmSuggestion" character varying,
        "tags" text,
        "duration" integer NOT NULL DEFAULT 45,
        "sourceScriptId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_templates_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_templates_userId" ON "templates" ("userId")'
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ark_model_overrides" (
        "modelKey" character varying(64) NOT NULL,
        "endpointId" character varying(200) NOT NULL,
        "apiKey" character varying(500) NOT NULL,
        "updatedBy" character varying(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ark_model_overrides_modelKey" PRIMARY KEY ("modelKey")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "ark_model_overrides"');
    await queryRunner.query('DROP TABLE IF EXISTS "templates"');
    await queryRunner.query('DROP TABLE IF EXISTS "notifications"');
    await queryRunner.query('DROP TABLE IF EXISTS "export_tasks"');
    await queryRunner.query('DROP TABLE IF EXISTS "trace_spans"');
    await queryRunner.query('DROP TABLE IF EXISTS "agent_runs"');
    await queryRunner.query('DROP TABLE IF EXISTS "creation_tasks"');
    await queryRunner.query('DROP TABLE IF EXISTS "scripts"');
    await queryRunner.query('DROP TABLE IF EXISTS "materials"');
    await queryRunner.query('DROP TABLE IF EXISTS "product_spaces"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
