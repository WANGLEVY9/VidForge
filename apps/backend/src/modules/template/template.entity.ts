import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ default: 'professional' })
  style: string;

  /** 分镜列表 JSON：{ title, description, voiceover, caption, camera, duration } */
  @Column({ type: 'json' })
  shots: Record<string, any>[];

  @Column({ nullable: true })
  voiceover: string;

  @Column({ nullable: true })
  bgmSuggestion: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: 45 })
  duration: number;

  @Column({ nullable: true })
  sourceScriptId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
