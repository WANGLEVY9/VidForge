import { Controller, Get, Post, Body, Param, Delete, Query, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import { AnalyzeMaterialDto } from './dto/analyze-material.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('素材管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('material')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @ApiOperation({ summary: '创建素材' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMaterialDto) {
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
