import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Script } from './script.entity';

@Entity()
export class Storyboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Script, (script) => script.storyboards, { onDelete: 'CASCADE' })
  script: Script;

  @Column()
  index: number; // 分镜序号

  @Column('text')
  sceneDescription: string; // 画面描述

  @Column({ nullable: true })
  cameraMovement: string; // 镜头运动

  @Column('text', { nullable: true })
  dialogue: string; // 台词/旁白

  @Column({ nullable: true })
  duration: number; // 时长，单位秒

  @Column({ nullable: true })
  bgm: string; // BGM要求

  @Column({ nullable: true })
  subtitle: string; // 字幕内容

  @Column('json', { nullable: true })
  style: Record<string, any>; // 视觉风格配置

  @Column('json', { nullable: true })
  metadata: Record<string, any>; // 其他元数据

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
