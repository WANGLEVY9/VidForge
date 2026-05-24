import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
  ) {}

  async create(dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepository.create(dto);
    return this.materialRepository.save(material);
  }

  async findAll(query: QueryMaterialDto) {
    const { search, type, tag, page = 1, pageSize = 20 } = query;
    const where: any = {};

    if (type) where.type = type;
    if (search) where.name = Like(`%${search}%`);
    if (tag) where.tags = Like(`%${tag}%`);

    const [list, total] = await this.materialRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total, page, pageSize };
  }

  async findOne(id: string): Promise<Material> {
    return this.materialRepository.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.materialRepository.delete(id);
  }
}
