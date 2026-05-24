import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('scripts')
export class Script {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
