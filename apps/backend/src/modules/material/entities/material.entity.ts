import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Index()
  @Column({ nullable: true })
  productSpaceId: string;

  @Column()
  name: string;

  @Column()
  type: 'image' | 'video' | 'audio';

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  size: number;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  productTags: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  videoTags: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  clipTags: Record<string, any>;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  /**
   * pgvector 向量列(1024 维),用于语义相似度检索。
   *
   * 前置条件(首次部署需手动执行):
   *   CREATE EXTENSION IF NOT EXISTS vector;
   *   ALTER TABLE materials ADD COLUMN IF NOT EXISTS "embedding" vector(1024);
   *
   * TypeORM 同步(synchronize:true)会自动检测 vector 类型,
   * 但需要 pgvector 扩展已安装,否则建表/改表会报错。
   */
  @Column({ type: 'vector', precision: 1024, nullable: true, select: false })
  embedding: number[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
