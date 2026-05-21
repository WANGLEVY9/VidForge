import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Storyboard } from './storyboard.entity';

export enum ScriptStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum VideoStyle {
  REALISTIC = 'realistic',
  ANIMATION = 'animation',
  MINIMALIST = 'minimalist',
  LUXURY = 'luxury',
  FRESH = 'fresh',
  DYNAMIC = 'dynamic',
  VINTAGE = 'vintage',
  TECHNOLOGY = 'technology',
}

@Entity()
export class Script {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // 剧本标题

  @Column('text', { nullable: true })
  productName: string; // 商品名称

  @Column('simple-array', { nullable: true })
  sellingPoints: string[]; // 商品卖点

  @Column({ nullable: true })
  targetAudience: string; // 目标人群

  @Column({ nullable: true })
  scene: string; // 使用场景

  @Column({
    type: 'enum',
    enum: VideoStyle,
    nullable: true,
  })
  style: VideoStyle; // 视频风格

  @Column({ default: 15 })
  totalDuration: number; // 总时长，单位秒，默认15s

  @Column({
    type: 'enum',
    enum: ScriptStatus,
    default: ScriptStatus.DRAFT,
  })
  status: ScriptStatus;

  @Column('text', { nullable: true })
  prompt: string; // 生成使用的Prompt

  @Column('json', { nullable: true })
  constraints: Record<string, any>; // 约束规则

  @Column('simple-array', { nullable: true })
  tags: string[]; // 标签

  @OneToMany(() => Storyboard, (storyboard) => storyboard.script, { cascade: true })
  storyboards: Storyboard[]; // 分镜列表

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
