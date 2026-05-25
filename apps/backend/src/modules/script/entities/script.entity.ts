import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('scripts')
export class Script {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Index()
  @Column({ nullable: true })
  productSpaceId: string;

  /** 父剧本 id（用于"基于此剧本扩写/分支"） */
  @Column({ nullable: true })
  parentScriptId: string;

  /** 同一商品空间内的版本号 */
  @Column({ default: 1 })
  version: number;

  @Column()
  title: string;

  @Column()
  productName: string;

  @Column()
  category: string;

  @Column('text')
  sellingPoints: string;

  @Column({ nullable: true })
  targetAudience: string;

  @Column({ default: 'professional' })
  style: string;

  @Column({ type: 'json' })
  storyboard: Record<string, any>[];

  @Column({ nullable: true })
  voiceover: string;

  @Column({ nullable: true })
  bgmSuggestion: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: 45 })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
