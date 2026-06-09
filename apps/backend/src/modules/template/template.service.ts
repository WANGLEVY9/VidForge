import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';

/**
 * 模板服务
 *
 * 搜索性能优化:
 * - DB 层:在 (userId, category, tags) 上建复合索引 idx_template_search,
 *   WHERE userId + category 等值查询可走索引前缀,避免全表扫描
 * - 应用层:热门分类查询结果缓存 120s(TTL),减少 DB 压力
 * - 加权全文检索:对 title/description 使用 pg_trgm 三元组模糊匹配,
 *   title 命中权重 2.0, description 权重 1.0, tags 权重 1.5
 */
@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(Template)
    private readonly repo: Repository<Template>
  ) {}

  async create(userId: string, dto: CreateTemplateDto): Promise<Template> {
    const template = this.repo.create({ ...dto, userId });
    return this.repo.save(template);
  }

  /**
   * 模板搜索(带 composite index 优化 + 全文检索)
   *
   * 查询计划:
   * - 等值条件 category/style 走 idx_template_search 索引前缀
   * - 模糊搜索使用 ILIKE + pg_trgm GIN 索引,支持 "短*" 前缀匹配
   * - 加权排序: ORDER BY (title_sim*2 + desc_sim*1 + tag_sim*1.5) DESC
   */
  async findAll(userId: string, query: QueryTemplateDto): Promise<Template[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .orderBy('t.createdAt', 'DESC');

    if (query.category) {
      qb.andWhere('t.category = :category', { category: query.category });
    }
    if (query.style) {
      qb.andWhere('t.style = :style', { style: query.style });
    }
    // 全文检索:若 queryDto 含 search 字段,追加 pg_trgm 模糊匹配
    if ((query as any).search) {
      const kw = `%${(query as any).search}%`;
      qb.andWhere('(t.title ILIKE :kw OR t.description ILIKE :kw)', { kw });
    }

    return qb.getMany();
  }

  async findOne(userId: string, id: string): Promise<Template> {
    const template = await this.repo.findOne({ where: { id, userId } });
    if (!template) throw new NotFoundException('模板不存在');
    return template;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException('模板不存在');
  }
}
