import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ProviderOperationStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

/**
 * Durable audit record for one external side effect owned by an Agent node.
 *
 * It deliberately stores a request hash and sanitized metadata rather than a
 * raw prompt or provider credentials. The remote ID is written immediately
 * after a provider accepts the request, closing the observability gap between
 * graph checkpoints and external asynchronous work.
 */
@Entity('provider_operations')
@Index('IDX_provider_operations_provider_key', ['provider', 'idempotencyKey'], { unique: true })
@Index('IDX_provider_operations_run_user', ['runId', 'userId'])
@Index('IDX_provider_operations_status', ['status', 'updatedAt'])
export class ProviderOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 220 })
  runId: string;

  @Column({ length: 120 })
  nodeName: string;

  @Column({ length: 80 })
  provider: string;

  @Column({ length: 80 })
  capability: string;

  @Column({ length: 220 })
  idempotencyKey: string;

  @Column({ length: 64 })
  requestHash: string;

  @Column({ length: 500, nullable: true })
  remoteOperationId: string | null;

  @Column({ default: 'pending' })
  status: ProviderOperationStatus;

  /** Number of requests accepted by a provider for this stable operation key. */
  @Column({ default: 0 })
  attempt: number;

  /** Non-sensitive request facts such as shot ID, duration and resolution. */
  @Column('json', { nullable: true })
  requestMetadata: Record<string, unknown> | null;

  /** Non-sensitive result facts such as an artifact URL or provider status. */
  @Column('json', { nullable: true })
  resultMetadata: Record<string, unknown> | null;

  @Column('text', { nullable: true })
  errorMessage: string | null;

  @Column({ nullable: true })
  dispatchedAt: Date | null;

  @Column({ nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
