import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(Template)
    private readonly repo: Repository<Template>,
  ) {}

  async create(userId: string, dto: CreateTemplateDto): Promise<Template> {
    const template = this.repo.create({ ...dto, userId });
    return this.repo.save(template);
  }

  async findAll(userId: string, query: QueryTemplateDto): Promise<Template[]> {
    const qb = this.repo.createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .orderBy('t.createdAt', 'DESC');

    if (query.category) {
      qb.andWhere('t.category = :category', { category: query.category });
    }
    if (query.style) {
      qb.andWhere('t.style = :style', { style: query.style });
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
