import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

/**
 * ARK 模型 key 的运行时覆盖。
 *
 * 优先级:DB override > env(若不在黑名单) > 代码内置 builtin
 *
 * 这张表行数极少(目前最多两行 text-primary / video-primary),
 * 主要承载"运维/演示者在 UI 上临时换 key"的需求。
 */
@Entity('ark_model_overrides')
export class ArkModelOverride {
  /**
   * 'text-primary' / 'video-primary',与 ArkModelConfig.key 对齐
   */
  @PrimaryColumn({ type: 'varchar', length: 64 })
  modelKey: string;

  @Column({ type: 'varchar', length: 200 })
  endpointId: string;

  @Column({ type: 'varchar', length: 500 })
  apiKey: string;

  /**
   * 最后更新者 userId(供审计)
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
