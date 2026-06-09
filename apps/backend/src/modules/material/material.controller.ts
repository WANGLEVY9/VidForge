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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
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

const UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads');

@ApiTags('素材管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('material')
export class MaterialController {
  constructor(
    private readonly materialService: MaterialService,
    private readonly queueRunner: QueueRunnerService,
    private readonly storageService: StorageService
  ) {}

  @Post()
  @ApiOperation({ summary: '创建素材(JSON)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMaterialDto) {
    return this.materialService.create(user.sub, dto);
  }

  /**
   * 文件上传端点
   *
   * 接收 multipart/form-data，流程：
   * 1. Multer 将文件写入 storage/uploads/ 目录（磁盘存储，200MB 限制，MIME 过滤）
   * 2. StorageService 判断是否启用 OSS：
   *    - 是 → 上传到阿里云 OSS，删除本地临时文件，返回 OSS 公开 URL
   *    - 否 → 保留本地，返回 /static/uploads/xxx 路径
   * 3. 创建素材数据库记录
   * 4. 异步入队 AI 分析
   */
  @Post('upload')
  @ApiOperation({ summary: '上传素材文件( multipart )' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const safeName = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, safeName);
        },
      }),
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
    if (!file) throw new BadRequestException('请选择要上传的文件');

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

    // 通过 StorageService 存储文件（OSS 或本地），获取可公开访问的 URL
    const fileUrl = await this.storageService.storeUpload(file.path, file.filename, file.mimetype);

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
    return material;
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
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryMaterialDto) {
    return this.materialService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取素材详情' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.materialService.findOne(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.materialService.remove(user.sub, id);
  }

  @Patch(':id/analyze')
  @ApiOperation({ summary: 'AI分析素材并生成三层标签' })
  analyze(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AnalyzeMaterialDto
  ) {
    return this.materialService.analyzeTags(user.sub, id, dto);
  }

  @Get('search/tags')
  @ApiOperation({ summary: '按标签层级搜索素材' })
  searchByTags(
    @CurrentUser() user: JwtPayload,
    @Query('productCategory') productCategory?: string,
    @Query('videoMood') videoMood?: string,
    @Query('clipObjects') clipObjects?: string
  ) {
    return this.materialService.searchByTags(user.sub, { productCategory, videoMood, clipObjects });
  }

  @Post('search/semantic')
  @ApiOperation({ summary: '语义搜索素材' })
  semanticSearch(@CurrentUser() user: JwtPayload, @Body() dto: SemanticSearchDto) {
    return this.materialService.semanticSearch(user.sub, dto);
  }
}
