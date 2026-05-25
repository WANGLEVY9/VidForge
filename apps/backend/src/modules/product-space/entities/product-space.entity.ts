import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 商品空间（Product Space）：
 * 一个商家通常会同时推广多个商品，每个商品需要独立的素材库 / 剧本 / 视频任务。
 * 在 VidForge 中，所有 material/script/creation_task 都归属于一个 productSpace。
 */
@Entity('product_spaces')
export class ProductSpace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  coverUrl: string;

  /** 是否为默认空间（用户首次注册自动创建） */
  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
