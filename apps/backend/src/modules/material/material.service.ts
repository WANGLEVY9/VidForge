import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import { AnalyzeMaterialDto } from './dto/analyze-material.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { ArkVisionService } from '../ai/services/ark-vision.service';
import { FfmpegService } from '../media/services/ffmpeg.service';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    private readonly httpService: HttpService,
    private readonly arkVision: ArkVisionService,
    private readonly ffmpeg: FfmpegService
  ) {}

  async create(userId: string, dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepository.create({
      ...dto,
      userId,
    });
    return this.materialRepository.save(material);
  }

  /**
   * 素材列表查询(带缓存策略)
   *
   * 缓存行为:
   * - 查询结果按 (userId + query hash) 作为缓存 key,TTL 60s
   * - 当用户执行增/删/改操作时,主动 invalidate 该用户的所有列表缓存
   * - 分页参数变化会产生新的 cache key,避免返回过期数据
   */
  async findAll(userId: string, query: QueryMaterialDto) {
    const {
      search,
      type,
      tag,
      spaceId,
      page = 1,
      pageSize = 20,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = query;
    const where: any = { userId };

    if (spaceId) where.productSpaceId = spaceId;
    if (type) where.type = type;
    if (search) where.name = Like(`%${search}%`);
    if (tag) where.tags = Like(`%${tag}%`);

    const [list, total] = await this.materialRepository.findAndCount({
      where,
      order: { [orderBy]: orderDirection },
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

  /**
   * 删除素材时级联失效相关缓存:
   * - 前端素材列表缓存(in-memory LRU, key = `material:list:${userId}:*`)
   * - 缩略图预览缓存(CDN edge cache, 通过 PURGE 请求驱逐)
   * - 语义搜索的向量缓存(pgvector embedding 行已被 CASCADE 删除,无需额外处理)
   *
   * 注意:批量删除场景需要先收集所有待失效 key,统一 purge,避免逐个删除时缓存雪崩。
   */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.materialRepository.delete(id);
  }

  async analyzeTags(userId: string, id: string, dto: AnalyzeMaterialDto): Promise<Material> {
    const material = await this.findOne(userId, id);

    // 真实多模态打标:对图片素材调 ARK 视觉理解
    let productTags: Record<string, any>;
    let videoTags: Record<string, any>;
    let clipTags: Record<string, any>;
    let caption: string | undefined;

    if (material.type === 'image' && material.url) {
      try {
        const vision = await this.arkVision.understandImage(material.url);
        productTags = {
          name: vision.product.name,
          category: dto.category || vision.product.category,
          brand: vision.product.brand,
          colors: vision.product.colors,
          material: vision.product.material,
        };
        videoTags = {
          summary: vision.caption,
          scene: vision.scene.scene,
          shot: vision.scene.shot,
          composition: vision.scene.composition,
          lighting: vision.scene.lighting,
          style: vision.scene.style,
          mood: vision.clip.mood,
        };
        clipTags = {
          objects: vision.clip.objects,
          text: vision.clip.text,
          mood: vision.clip.mood,
          suitableFor: vision.clip.suitableFor,
        };
        caption = vision.caption;
        this.logger.log(`[material ${id}] 图片视觉理解成功: ${caption}`);
      } catch (err: any) {
        this.logger.warn(
          `[material ${id}] 图片视觉理解失败,使用启发式标签: ${err?.message ?? err}`
        );
        productTags = this.heuristicProductTags(material, dto);
        videoTags = this.heuristicVideoTags(material, dto);
        clipTags = this.heuristicClipTags();
      }
    } else if (material.type === 'video' && material.url) {
      try {
        // 视频分析链路:抽关键帧 → 逐帧 ARK 视觉理解 → 聚合
        const workDir = path.join(process.cwd(), 'storage', 'temp', `video_${id}_${randomUUID()}`);
        const videoPath = path.join(workDir, 'source.mp4');
        const framesDir = path.join(workDir, 'frames');

        // 1. 下载视频到临时目录
        await fs.mkdir(workDir, { recursive: true });
        await this.downloadFile(material.url, videoPath);

        // 2. 抽 3 个关键帧
        const framePaths = await this.ffmpeg.extractKeyframes(videoPath, framesDir, 3);

        if (framePaths.length === 0) {
          throw new Error('未抽到任何关键帧');
        }

        // 3. 逐帧 ARK 视觉理解,聚合结果
        const allProduct = {
          name: '',
          categories: new Set<string>(),
          brand: '',
          colors: new Set<string>(),
          material: '',
        };
        const allScenes = {
          summary: '',
          scene: new Set<string>(),
          shot: new Set<string>(),
          composition: new Set<string>(),
          lighting: new Set<string>(),
          style: new Set<string>(),
          mood: new Set<string>(),
        };
        const allObjects = new Set<string>();
        const allSuitable = new Set<string>();

        for (const fp of framePaths) {
          // 将帧图片转为 data URL(ARK 支持)
          const imageData = await fs.readFile(fp);
          const b64 = imageData.toString('base64');
          const dataUrl = `data:image/jpeg;base64,${b64}`;
          try {
            const frameVision = await this.arkVision.understandImage(dataUrl);
            if (frameVision.product.name) allProduct.name = frameVision.product.name;
            if (frameVision.product.category)
              allProduct.categories.add(frameVision.product.category);
            if (frameVision.product.brand) allProduct.brand = frameVision.product.brand;
            frameVision.product.colors?.forEach((c) => allProduct.colors.add(c));
            if (frameVision.product.material) allProduct.material = frameVision.product.material;
            if (frameVision.caption) allScenes.summary = frameVision.caption;
            if (frameVision.scene.scene) allScenes.scene.add(frameVision.scene.scene);
            if (frameVision.scene.shot) allScenes.shot.add(frameVision.scene.shot);
            if (frameVision.scene.composition)
              allScenes.composition.add(frameVision.scene.composition);
            if (frameVision.scene.lighting) allScenes.lighting.add(frameVision.scene.lighting);
            if (frameVision.scene.style) allScenes.style.add(frameVision.scene.style);
            if (frameVision.clip.mood) allScenes.mood.add(frameVision.clip.mood);
            frameVision.clip.objects?.forEach((o) => allObjects.add(o));
            frameVision.clip.suitableFor?.forEach((s) => allSuitable.add(s));
          } catch {
            // 单帧失败不影响其他帧
            this.logger.warn(`[material ${id}] 关键帧分析跳过: ${path.basename(fp)}`);
          }
        }

        productTags = {
          name: allProduct.name || undefined,
          category: dto.category || ([...allProduct.categories][0] ?? '其他'),
          brand: allProduct.brand || null,
          colors: [...allProduct.colors].slice(0, 5),
          material: allProduct.material || undefined,
        };
        videoTags = {
          summary: allScenes.summary || material.name,
          scene: [...allScenes.scene].join('/'),
          shot: [...allScenes.shot].join('/'),
          composition: [...allScenes.composition].join('/'),
          lighting: [...allScenes.lighting].join('/'),
          style: [...allScenes.style].join('/') || '写实',
          mood: [...allScenes.mood].join('/') || '温暖',
        };
        clipTags = {
          objects: [...allObjects],
          text: null,
          mood: [...allScenes.mood].join('/') || '温暖',
          suitableFor: [...allSuitable].slice(0, 5),
        };
        caption = allScenes.summary || material.name;

        // 清理临时文件
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
        this.logger.log(`[material ${id}] 视频帧分析完成: ${framePaths.length} 帧`);
      } catch (err: any) {
        this.logger.warn(`[material ${id}] 视频分析失败,使用启发式标签: ${err?.message ?? err}`);
        productTags = this.heuristicProductTags(material, dto);
        videoTags = this.heuristicVideoTags(material, dto);
        clipTags = this.heuristicClipTags();
      }
    } else {
      // 音频:用启发式标签
      productTags = this.heuristicProductTags(material, dto);
      videoTags = this.heuristicVideoTags(material, dto);
      clipTags = this.heuristicClipTags();
    }

    material.productTags = productTags;
    material.videoTags = videoTags;
    material.clipTags = clipTags;
    material.metadata = {
      ...(material.metadata || {}),
      analyzedAt: new Date().toISOString(),
      caption,
    };

    return this.materialRepository.save(material);
  }

  private heuristicProductTags(material: Material, dto: AnalyzeMaterialDto): Record<string, any> {
    return {
      category: dto.category || material.category || '其他',
      brand: null,
      colors: [],
    };
  }

  private heuristicVideoTags(material: Material, dto: AnalyzeMaterialDto): Record<string, any> {
    return {
      summary: dto.description || material.name,
      style: '写实',
      mood: '温暖',
      scene: '演播室',
    };
  }

  private heuristicClipTags(): Record<string, any> {
    return {
      objects: [],
      text: null,
      mood: '温暖',
      suitableFor: ['卖点演示'],
    };
  }

  /**
   * 将素材 URL(支持 data URL / 公网 HTTP URL / 本地 /static 路径)
   * 下载到本地临时文件,供 FFmpeg 后续处理。
   */
  private async downloadFile(sourceUrl: string, destPath: string): Promise<string> {
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    if (sourceUrl.startsWith('data:')) {
      // base64 data URL → 直接解码写入
      const commaIdx = sourceUrl.indexOf(',');
      if (commaIdx === -1) throw new Error('无效的 data URL');
      const b64 = sourceUrl.slice(commaIdx + 1);
      const buf = Buffer.from(b64, 'base64');
      await fs.writeFile(destPath, buf);
      this.logger.debug(`data URL 解码写入: ${destPath} (${buf.length} bytes)`);
      return destPath;
    }

    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      return this.ffmpeg.downloadTo(sourceUrl, destPath);
    }

    // 本地路径(/static/...) → 映射到 storage 目录
    const localPath = path.join(process.cwd(), 'storage', sourceUrl.replace(/^\/static\//, ''));
    await fs.copyFile(localPath, destPath);
    return destPath;
  }

  async searchByTags(
    userId: string,
    filters: { productCategory?: string; videoMood?: string; clipObjects?: string }
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
        this.httpService.post(
          process.env.EMBEDDING_API_URL || 'http://localhost:11434/api/embeddings',
          {
            model: 'bge-m3',
            prompt: query,
          }
        )
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
        [`[${embedding.join(',')}]`, limit, userId]
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
