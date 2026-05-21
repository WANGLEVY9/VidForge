import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum MaterialType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

@Entity()
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: MaterialType,
  })
  type: MaterialType;

  @Column()
  url: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  size: number;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ nullable: true })
  duration: number; // 视频/音频时长，单位秒

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column('json', { nullable: true })
  metadata: Record<string, any>; // 结构化信息

  @Column({ type: 'text', nullable: true })
  embedding: string; // 向量特征

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
