import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgentMemoryKind, AgentMemoryMetadata, AgentMemoryScope } from './agent-memory.types';

/**
 * Long-term agent memory.
 *
 * Memory is deliberately separate from product-space configuration: product
 * facts are durable business data, while this table stores agent-learned
 * preferences, decisions and execution patterns with explicit provenance.
 */
@Entity('agent_memories')
@Index(['userId', 'productSpaceId'])
@Index(['userId', 'kind'])
@Index(['userId', 'semanticKey'], { unique: true })
export class AgentMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ nullable: true })
  productSpaceId: string | null;

  @Column({ nullable: true })
  sourceRunId: string | null;

  @Column({ default: 'product_space' })
  scope: AgentMemoryScope;

  @Column({ default: 'fact' })
  kind: AgentMemoryKind;

  /** Stable key used for idempotent writes from retries/replays. */
  @Column({ length: 220 })
  semanticKey: string;

  @Column('text')
  content: string;

  @Column('json', { nullable: true })
  metadata: AgentMemoryMetadata | null;

  @Column({ type: 'double precision', default: 0.5 })
  importance: number;

  @Column({ default: 0 })
  accessCount: number;

  @Column({ nullable: true })
  lastAccessedAt: Date | null;

  @Column({ nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
