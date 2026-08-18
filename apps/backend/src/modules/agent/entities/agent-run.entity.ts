import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type AgentRunStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Durable control-plane record for a LangGraph workflow run. */
@Entity('agent_runs')
@Index('IDX_agent_runs_user_idempotency', ['userId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
@Index('IDX_agent_runs_lease', ['status', 'leaseUntil'])
export class AgentRun {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  userId: string;

  /** Client supplied key used to safely retry the create request. */
  @Column({ length: 200, nullable: true })
  idempotencyKey: string | null;

  @Column({ default: 'pending' })
  status: AgentRunStatus;

  @Column({ default: '' })
  currentNode: string;

  @Column({ default: 0 })
  progress: number;

  /** Number of worker attempts, including the current attempt. */
  @Column({ default: 0 })
  attempt: number;

  /** Worker ownership metadata for atomic claim/lease based execution. */
  @Column({ length: 160, nullable: true })
  workerId: string | null;

  @Column({ nullable: true })
  leaseUntil: Date | null;

  @Column({ nullable: true })
  heartbeatAt: Date | null;

  /** Stable LangGraph thread used for durable node-level resume. */
  @Column({ length: 220, nullable: true })
  graphThreadId: string | null;

  @Column({ length: 220, nullable: true })
  checkpointId: string | null;

  /** Parent run for an explicit checkpoint fork. */
  @Column({ length: 220, nullable: true })
  parentRunId: string | null;

  @Column('json')
  input: Record<string, unknown>;

  @Column('json', { nullable: true })
  result: Record<string, unknown> | null;

  @Column({ nullable: true })
  errorMessage: string | null;

  @Column({ nullable: true })
  startedAt: Date | null;

  @Column({ nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
