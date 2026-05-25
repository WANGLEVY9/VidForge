import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import { AnalyzeMaterialDto } from './dto/analyze-material.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    private readonly httpService: HttpService,
  ) {}

  async create(userId: string, dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepository.create({
      ...dto,
      userId,
    });
    return this.materialRepository.save(material);
  }

  async findAll(userId: string, query: QueryMaterialDto) {
    const { search, type, tag, spaceId, page = 1, pageSize = 20 } = query;
    const where: any = { userId };

    if (spaceId) where.productSpaceId = spaceId;
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

  async findOne(userId: string, id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) throw new NotFoundException('素材不存在');
    if (material.userId && material.userId !== userId) {
      throw new ForbiddenException('无权访问该素材');
    }
    return material;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.materialRepository.delete(id);
  }

  async analyzeTags(userId: string, id: string, dto: AnalyzeMaterialDto): Promise<Material> {
    const material = await this.findOne(userId, id);

    const productTags: Record<string, any> = {
      category: dto.category || material.category || '通用',
      brand: null,
      priceRange: null,
      style: 'modern',
    };

    const videoTags: Record<string, any> = {
      summary: dto.description || material.name,
      style: 'cinematic',
      mood: 'professional',
      sceneTags: ['studio', 'product'],
    };

    const clipTags: Record<string, any> = {
      objects: ['product'],
      colors: ['#ffffff', '#000000'],
      composition: 'center',
      text: '',
    };

    material.productTags = productTags;
    material.videoTags = videoTags;
    material.clipTags = clipTags;
    material.metadata = {
      ...(material.metadata || {}),
      analyzedAt: new Date().toISOString(),
    };

    return this.materialRepository.save(material);
  }

  async searchByTags(
    userId: string,
    filters: { productCategory?: string; videoMood?: string; clipObjects?: string },
  ): Promise<Material[]> {
    const materials = await this.materialRepository.find({
      where: { userId, type: 'image' },
      order: { createdAt: 'DESC' },
    });

    return materials.filter((m) => {
      const pt = m.productTags as Record<string, any> | null;
      const vt = m.videoTags as Record<string, any> | null;
      const ct = m.clipTags as Record<string, any> | null;

      if (filters.productCategory && pt?.category !== filters.productCategory) return false;
      if (filters.videoMood && vt?.mood !== filters.videoMood) return false;
      if (filters.clipObjects && !ct?.objects?.includes(filters.clipObjects)) return false;
      return true;
    });
  }

  async semanticSearch(userId: string, dto: SemanticSearchDto): Promise<any> {
    const { query, limit = 20 } = dto;

    let embedding: number[];
    try {
      const response = await lastValueFrom(
        this.httpService.post(process.env.EMBEDDING_API_URL || 'http://localhost:11434/api/embeddings', {
          model: 'bge-m3',
          prompt: query,
        })
      );
      embedding = response.data.embedding;
    } catch {
      return this.materialRepository.find({
        where: { userId, name: Like(`%${query}%`) },
        take: limit,
        order: { createdAt: 'DESC' },
      });
    }

    try {
      const result = await this.materialRepository.query(
        `SELECT id, name, type, url, thumbnail_url, tags, category,
                1 - (embedding <=> $1::vector) AS similarity
         FROM materials
         WHERE embedding IS NOT NULL AND user_id = $3
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [`[${embedding.join(',')}]`, limit, userId],
      );
      return result;
    } catch {
      return this.materialRepository.find({
        where: { userId },
        take: limit,
        order: { createdAt: 'DESC' },
      });
    }
  }
}
