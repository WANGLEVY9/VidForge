import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Durable control-plane record for a LangGraph workflow run. */
@Entity('agent_runs')
export class AgentRun {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ default: 'pending' })
  status: AgentRunStatus;

  @Column({ default: '' })
  currentNode: string;

  @Column({ default: 0 })
  progress: number;

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
