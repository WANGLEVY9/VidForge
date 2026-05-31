import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 端到端 trace 表
 *
 * 一个"业务任务"会产生多条 trace_span 记录,每条对应一个执行节点:
 *   span = orchestrator / material_analysis / script_generation
 *        / video_composition / quality_control / ffmpeg / ark.text / ark.video
 *
 * 这张表撑起 Dashboard 的 trace 瀑布图、成本看板与 cache hit 看板。
 */
@Entity('trace_spans')
export class TraceSpan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  /** 业务任务 ID(creation_task / agent_task / export_task)。 */
  @Index()
  @Column()
  taskId: string;

  /** 业务域: creation / agent / export / material */
  @Index()
  @Column()
  scope: string;

  /** Span 名称 */
  @Index()
  @Column()
  span: string;

  @Column()
  startedAt: Date;

  @Column()
  endedAt: Date;

  /** 毫秒 */
  @Column()
  latencyMs: number;

  /** ok / error */
  @Index()
  @Column({ default: 'ok' })
  status: 'ok' | 'error';

  /** 输入/输出/错误的简短摘要 */
  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  /** 模型名(如 Doubao-Seed-2.0-pro / Doubao-Seedance-1.5-pro / ffmpeg) */
  @Column({ nullable: true })
  model: string;

  /** Token 消耗(LLM 调用) */
  @Column({ default: 0 })
  promptTokens: number;

  @Column({ default: 0 })
  completionTokens: number;

  /** 估算成本(美分,1 cent = 0.01 USD) */
  @Column({ type: 'float', nullable: true })
  costCents: number;

  /** 命中缓存(火山方舟 prompt cache) */
  @Column({ default: false })
  cacheHit: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
