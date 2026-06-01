import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type NotificationType = 'system' | 'task' | 'compliance' | 'tip';

/**
 * 通知/消息中心实体
 *
 * - userId 为 null 时表示系统广播(所有登录用户都能看到)
 *   广播条目不计入 Badge 未读数,前端展示时单独 pin 在顶部
 * - userId 非 null 时表示定向给某个用户(可标记已读/删除)
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 接收者 userId,null = 系统广播
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 32, default: 'system' })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  /**
   * 可选跳转路径,前端点击通知后 navigate 到此处
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  /**
   * 已读标记。仅对 personal 通知有意义,广播通知此字段忽略
   */
  @Index()
  @Column({ type: 'boolean', default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
