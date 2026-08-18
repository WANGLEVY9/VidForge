import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AgentOutboxStatus = 'pending' | 'dispatching' | 'dispatched' | 'failed';

/**
 * Transactional outbox entry for durable Agent dispatch.
 *
 * The payload is limited to queue instructions and never contains provider
 * credentials or raw prompts. A stable dedupe key makes a crash between
 * BullMQ enqueue and the status update harmless when the event is retried.
 */
@Entity('agent_outbox_events')
@Index('IDX_agent_outbox_ready', ['status', 'availableAt'])
@Index('UQ_agent_outbox_dedupe', ['dedupeKey'], { unique: true })
export class AgentOutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80 })
  eventType: string;

  @Column({ length: 220 })
  aggregateId: string;

  @Column({ length: 160 })
  dedupeKey: string;

  @Column('json')
  payload: Record<string, unknown>;

  @Column({ length: 20, default: 'pending' })
  status: AgentOutboxStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  availableAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @Column({ length: 160, nullable: true })
  lockedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  dispatchedAt: Date | null;

  @Column({ length: 500, nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
