import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Script } from '../../script/entities/script.entity';
import { VideoAspectRatio, VideoResolution } from '@vidforge/common';

export enum VideoTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  GENERATING_SCRIPT = 'generating_script',
  GENERATING_ASSETS = 'generating_assets',
  RENDERING = 'rendering',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ExportFormat {
  MP4 = 'mp4',
  MOV = 'mov',
  AVI = 'avi',
  WEBM = 'webm',
}

@Entity()
export class VideoTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 视频任务名称

  @ManyToOne(() => Script, { nullable: true })
  @JoinColumn()
  script: Script; // 关联的剧本

  @Column({ nullable: true })
  scriptId: string;

  @Column({
    type: 'enum',
    enum: VideoResolution,
    default: VideoResolution.RESOLUTION_1080P,
  })
  resolution: VideoResolution; // 视频分辨率

  @Column({
    type: 'enum',
    enum: VideoAspectRatio,
    default: VideoAspectRatio.RATIO_9_16,
  })
  aspectRatio: VideoAspectRatio; // 视频比例

  @Column({
    type: 'enum',
    enum: ExportFormat,
    default: ExportFormat.MP4,
  })
  exportFormat: ExportFormat; // 导出格式

  @Column({
    type: 'enum',
    enum: VideoTaskStatus,
    default: VideoTaskStatus.PENDING,
  })
  status: VideoTaskStatus;

  @Column({ type: 'int', default: 0 })
  progress: number; // 进度0-100

  @Column('text', { nullable: true })
  errorMessage: string; // 失败原因

  @Column({ nullable: true })
  videoUrl: string; // 生成的视频地址

  @Column({ nullable: true })
  videoSize: number; // 视频大小，字节

  @Column({ nullable: true })
  duration: number; // 视频时长，秒

  @Column('json', { nullable: true })
  metadata: Record<string, any>; // 其他元数据

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
