import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, FindOptionsWhere } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

export interface CreateNotificationInput {
  userId?: string | null;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}

@Injectable()
export class NotificationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>
  ) {}

  async onApplicationBootstrap() {
    // 启动种子:仅当全表为空时,插入 3 条系统广播,让新部署也有内容展示
    try {
      const total = await this.repo.count();
      if (total > 0) return;
      await this.repo.save([
        this.repo.create({
          userId: null,
          type: 'system',
          title: '🎉 欢迎使用 VidForge',
          content:
            '真实视频生成管线已上线 — 火山方舟 Doubao 文本/视觉/视频模型 + LangGraph 4 节点 Agent,可端到端生成 9:16 / 16:9 带货短视频。',
          link: '/workspace',
        }),
        this.repo.create({
          userId: null,
          type: 'compliance',
          title: '🛡 合规审核已启用',
          content:
            '剧本生成完成会自动扫描广告法极限词、医疗禁用语等。可在商品空间「知识库」中扩展自有禁用词典。',
          link: null,
        }),
        this.repo.create({
          userId: null,
          type: 'tip',
          title: '📊 数据看板新增成本总览',
          content:
            '右上角点击「API 状态」可查看实时模型连接情况;Dashboard 顶部新增 Token 与视频成本卡片,实时观测今日花费。',
          link: '/workspace',
        }),
      ]);
      this.logger.log('已注入 3 条启动广播通知');
    } catch (err: any) {
      // 启动种子失败不应阻塞应用,大多发生在 DB 还没建表时
      this.logger.warn(`注入启动广播失败(忽略): ${err?.message ?? err}`);
    }
  }

  /**
   * 列出某用户可见的通知(自己的 personal + 全员广播),按 createdAt DESC
   */
  async list(
    userId: string,
    opts: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}
  ) {
    const page = Math.max(1, Number(opts.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize ?? 20)));

    // 同时取 personal(read=false 可选) + 广播
    const where: FindOptionsWhere<Notification>[] = [];
    if (opts.unreadOnly) {
      where.push({ userId, read: false });
    } else {
      where.push({ userId });
    }
    where.push({ userId: IsNull() });

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  /**
   * 当前用户的未读 personal 通知数(广播不计入)
   */
  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, read: false } });
  }

  /**
   * 标记自己的某条 personal 通知为已读;广播通知会被忽略
   */
  async markRead(userId: string, id: string): Promise<Notification> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('通知不存在');
    if (item.userId === null) {
      // 广播通知不维护已读
      return item;
    }
    if (item.userId !== userId) throw new NotFoundException('通知不存在');
    if (!item.read) {
      item.read = true;
      await this.repo.save(item);
    }
    return item;
  }

  /**
   * 把当前用户的全部 personal 未读通知标记为已读
   *
   * 批量操作优化:
   * - 使用单条 UPDATE ... WHERE userId = X AND read = false,一次 DB roundtrip
   * - 避免 SELECT 全量 → 逐行 save 的 N+1 问题(旧实现 500 条通知需要 501 次查询)
   * - TypeORM update() 直接生成 UPDATE 语句,不加载实体到内存
   * - 返回 affected rows 供前端确认更新条数
   */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repo.update({ userId, read: false }, { read: true });
    return { updated: result.affected ?? 0 };
  }

  /**
   * 删除自己的 personal 通知;广播无法被单个用户删除
   */
  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('通知不存在');
    if (item.userId === null) {
      // 不允许删除广播
      return { ok: true };
    }
    if (item.userId !== userId) throw new NotFoundException('通知不存在');
    await this.repo.remove(item);
    return { ok: true };
  }

  /**
   * 业务侧调用入口:给某个用户(或全员)发通知
   * 失败不抛异常,仅 warn — 通知应当是 best-effort 副作用,不能影响主业务流程
   */
  async create(input: CreateNotificationInput): Promise<Notification | null> {
    try {
      const entity = this.repo.create({
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        content: input.content,
        link: input.link ?? null,
        read: false,
      });
      return await this.repo.save(entity);
    } catch (err: any) {
      this.logger.warn(`通知创建失败(忽略): ${err?.message ?? err}`);
      return null;
    }
  }

  /**
   * 给一组用户群发(常用于功能上线公告)
   *
   * 批量插入使用单条 INSERT ... VALUES (...), (...), (...) 语句,
   * 避免逐条 create + save 产生 N 次 DB roundtrip。
   * TypeORM repo.save(entities[]) 内部会合并为单条 INSERT。
   */
  async createForUsers(
    userIds: string[],
    payload: Omit<CreateNotificationInput, 'userId'>
  ): Promise<number> {
    if (!userIds.length) return 0;
    try {
      const entities = userIds.map((uid) =>
        this.repo.create({ ...payload, userId: uid, read: false })
      );
      const saved = await this.repo.save(entities);
      return saved.length;
    } catch (err: any) {
      this.logger.warn(`通知群发失败(忽略): ${err?.message ?? err}`);
      return 0;
    }
  }

  /** 内部使用:按 id 列表查询(仅供调试) */
  async findByIds(ids: string[]): Promise<Notification[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }
}
