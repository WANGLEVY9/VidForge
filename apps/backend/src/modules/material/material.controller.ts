import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import { AnalyzeMaterialDto } from './dto/analyze-material.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Material } from './entities/material.entity';
import { QueueRunnerService } from '../queue/queue-runner.service';
import { StorageService } from '../media/services/storage.service';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants';

@ApiTags('素材管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('material')
export class MaterialController {
  private readonly logger = new Logger(MaterialController.name);

  constructor(
    private readonly materialService: MaterialService,
    private readonly queueRunner: QueueRunnerService,
    private readonly storageService: StorageService
  ) {}

  @Post()
  @ApiOperation({ summary: '创建素材(JSON)' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMaterialDto) {
    const m = await this.materialService.create(user.sub, dto);
    return this.resolveMaterialUrls(m);
  }

  /**
   * 文件上传端点
   *
   * 接收 multipart/form-data，流程：
   * 1. Multer 使用 memoryStorage 将文件保存在内存中（不依赖本地磁盘目录）
   * 2. 写入临时文件到 storage/tmp/uploads/
   * 3. StorageService 判断是否启用 OSS：
   *    - 是 → 上传到阿里云 OSS，删除临时文件
   *    - 否 → 移动到 storage/uploads/，返回 /static/uploads/xxx 路径
   * 4. 创建素材数据库记录
   * 5. 异步入队 AI 分析
   */
  @Post('upload')
  @ApiOperation({ summary: '上传素材文件( multipart )' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 200 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'video/mp4',
          'audio/mpeg',
          'audio/mp3',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`不支持的媒体类型: ${file.mimetype}`), false);
        }
      },
    })
  )
  async uploadFile(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('productSpaceId') productSpaceId?: string,
    @Body('category') category?: string,
    @Body('tags') tagsRaw?: string
  ): Promise<Material> {
    if (!file) {
      this.logger.warn('上传请求中未找到文件字段');
      throw new BadRequestException('请选择要上传的文件');
    }

    // 从 MIME 推断素材类型
    const typeMap: Record<string, 'image' | 'video' | 'audio'> = {
      'image/jpeg': 'image',
      'image/png': 'image',
      'image/webp': 'image',
      'video/mp4': 'video',
      'audio/mpeg': 'audio',
      'audio/mp3': 'audio',
    };
    const mimeType = file.mimetype;
    const assetType = typeMap[mimeType] ?? 'image';

    // tags 以逗号分隔的字符串传入,转回数组
    const tags: string[] | undefined = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : undefined;

    // 生成唯一文件名
    const filename = `${randomUUID()}${extname(file.originalname)}`;

    // 将内存中的文件写入临时位置，供 StorageService 处理
    const tmpDir = path.join(process.cwd(), 'storage', 'tmp', 'uploads');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, filename);
    await fs.writeFile(tmpPath, file.buffer);

    // 通过 StorageService 存储文件（OSS 或本地），获取可公开访问的 URL
    const fileUrl = await this.storageService.storeUpload(tmpPath, filename, file.mimetype);

    const dto: CreateMaterialDto = {
      name: file.originalname,
      type: assetType,
      url: fileUrl,
      size: file.size,
      tags,
      category: category || undefined,
      productSpaceId: productSpaceId || undefined,
    };

    const material = await this.materialService.create(user.sub, dto);
    await this.enqueueAutoAnalyze(user.sub, material);
    return this.resolveMaterialUrls(material);
  }

  /** 上传完成后自动入队 AI 分析(异步,不阻塞返回) */
  private async enqueueAutoAnalyze(userId: string, material: Material): Promise<void> {
    if (material.type === 'audio') return; // 音频暂不支持视觉分析
    await this.queueRunner.enqueue(
      QUEUE_NAMES.MATERIAL_ANALYZE,
      JOB_NAMES.ANALYZE_MATERIAL,
      { userId, materialId: material.id, category: material.category },
      // Redis 不可用时降级为进程内直接分析
      async () => {
        await this.materialService.analyzeTags(userId, material.id, {
          category: material.category,
        });
      }
    );
  }

  @Get()
  @ApiOperation({ summary: '获取素材列表（按当前用户隔离，可选 spaceId 过滤）' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryMaterialDto) {
    const result = await this.materialService.findAll(user.sub, query);
    return { ...result, list: result.list.map((m) => this.resolveMaterialUrls(m)) };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取素材详情' })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const m = await this.materialService.findOne(user.sub, id);
    return this.resolveMaterialUrls(m);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.materialService.remove(user.sub, id);
  }

  @Patch(':id/analyze')
  @ApiOperation({ summary: 'AI分析素材并生成三层标签' })
  async analyze(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AnalyzeMaterialDto
  ) {
    const m = await this.materialService.analyzeTags(user.sub, id, dto);
    return this.resolveMaterialUrls(m);
  }

  @Get('search/tags')
  @ApiOperation({ summary: '按标签层级搜索素材' })
  async searchByTags(
    @CurrentUser() user: JwtPayload,
    @Query('productCategory') productCategory?: string,
    @Query('videoMood') videoMood?: string,
    @Query('clipObjects') clipObjects?: string
  ) {
    const list = await this.materialService.searchByTags(user.sub, {
      productCategory,
      videoMood,
      clipObjects,
    });
    return list.map((m) => this.resolveMaterialUrls(m));
  }

  @Post('search/semantic')
  @ApiOperation({ summary: '语义搜索素材' })
  async semanticSearch(@CurrentUser() user: JwtPayload, @Body() dto: SemanticSearchDto) {
    const result = await this.materialService.semanticSearch(user.sub, dto);
    // semanticSearch 可能返回原始 SQL 行(snake_case)或 Material 实例(camelCase)
    if (Array.isArray(result)) {
      return result.map((m: any) => {
        if (m.url) m.url = this.storageService.resolveUrl(m.url);
        const thumb = m.thumbnail_url ?? m.thumbnailUrl;
        if (thumb) {
          m.thumbnail_url = this.storageService.resolveUrl(thumb);
          m.thumbnailUrl = m.thumbnail_url;
        }
        return m;
      });
    }
    return result;
  }

  /** 将素材 URL 从相对路径(/static/...) 解析为完整的公网 URL */
  private resolveMaterialUrls(material: Material): Material {
    // 浅拷贝避免修改 DB 实体
    const clone = Object.assign(Object.create(Object.getPrototypeOf(material)), material);
    if (clone.url) clone.url = this.storageService.resolveUrl(clone.url);
    if (clone.thumbnailUrl) clone.thumbnailUrl = this.storageService.resolveUrl(clone.thumbnailUrl);
    return clone;
  }
}
