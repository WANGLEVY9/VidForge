import { Controller, Get, Post, Body, Param, Delete, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import { AnalyzeMaterialDto } from './dto/analyze-material.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';

@ApiTags('素材管理')
@Controller('material')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @ApiOperation({ summary: '创建素材' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materialService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  findAll(@Query() query: QueryMaterialDto) {
    return this.materialService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取素材详情' })
  findOne(@Param('id') id: string) {
    return this.materialService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  remove(@Param('id') id: string) {
    return this.materialService.remove(id);
  }

  @Patch(':id/analyze')
  @ApiOperation({ summary: 'AI分析素材并生成三层标签' })
  analyze(@Param('id') id: string, @Body() dto: AnalyzeMaterialDto) {
    return this.materialService.analyzeTags(id, dto);
  }

  @Get('search/tags')
  @ApiOperation({ summary: '按标签层级搜索素材' })
  searchByTags(
    @Query('productCategory') productCategory?: string,
    @Query('videoMood') videoMood?: string,
    @Query('clipObjects') clipObjects?: string,
  ) {
    return this.materialService.searchByTags({ productCategory, videoMood, clipObjects });
  }

  @Post('search/semantic')
  @ApiOperation({ summary: '语义搜索素材' })
  semanticSearch(@Body() dto: SemanticSearchDto) {
    return this.materialService.semanticSearch(dto);
  }
}
