import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
