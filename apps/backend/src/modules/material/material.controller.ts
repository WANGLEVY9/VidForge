import {
  Controller, Get, Post, Body, Param, Delete, Query, Patch,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
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

const UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads');

@ApiTags('素材管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('material')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @ApiOperation({ summary: '创建素材(JSON)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMaterialDto) {
    return this.materialService.create(user.sub, dto);
  }

  /**
   * 文件上传端点
   *
   * 接收 multipart/form-data,自动将文件写入 storage/uploads/ 目录,
   * 并在数据库中创建素材记录,URL 指向 /static/uploads/<file>。
   *
   * 受 NestJS 内置 multer 驱动,磁盘存储 + 200MB 限制 + MIME 类型过滤。
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
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/mp3'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`不支持的媒体类型: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('productSpaceId') productSpaceId?: string,
    @Body('category') category?: string,
    @Body('tags') tagsRaw?: string,
  ): Promise<Material> {
    if (!file) throw new BadRequestException('请选择要上传的文件');

    // 从 MIME 推断素材类型
    const typeMap: Record<string, 'image' | 'video' | 'audio'> = {
      'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image',
      'video/mp4': 'video',
      'audio/mpeg': 'audio', 'audio/mp3': 'audio',
    };
    const mimeType = file.mimetype;
    const assetType = typeMap[mimeType] ?? 'image';

    // tags 以逗号分隔的字符串传入,转回数组
    const tags: string[] | undefined = tagsRaw
      ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
      : undefined;

    const dto: CreateMaterialDto = {
      name: file.originalname,
      type: assetType,
      url: `/static/uploads/${file.filename}`,
      size: file.size,
      tags,
      category: category || undefined,
      productSpaceId: productSpaceId || undefined,
    };

    return this.materialService.create(user.sub, dto);
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
    @Body() dto: AnalyzeMaterialDto,
  ) {
    return this.materialService.analyzeTags(user.sub, id, dto);
  }

  @Get('search/tags')
  @ApiOperation({ summary: '按标签层级搜索素材' })
  searchByTags(
    @CurrentUser() user: JwtPayload,
    @Query('productCategory') productCategory?: string,
    @Query('videoMood') videoMood?: string,
    @Query('clipObjects') clipObjects?: string,
  ) {
    return this.materialService.searchByTags(user.sub, { productCategory, videoMood, clipObjects });
  }

  @Post('search/semantic')
  @ApiOperation({ summary: '语义搜索素材' })
  semanticSearch(@CurrentUser() user: JwtPayload, @Body() dto: SemanticSearchDto) {
    return this.materialService.semanticSearch(user.sub, dto);
  }
}
