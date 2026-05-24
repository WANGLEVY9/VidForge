import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('export_tasks')
export class ExportTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creationTaskId: string;

  @Column({ default: 'mp4' })
  format: 'mp4' | 'mov' | 'webm' | 'gif';

  @Column({ default: '1080p' })
  resolution: '2160p' | '1080p' | '720p' | '480p';

  @Column({ default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ nullable: true })
  progress: number;

  @Column({ nullable: true })
  outputUrl: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  errorMessage: string;

  @Column('json', { nullable: true })
  options: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
