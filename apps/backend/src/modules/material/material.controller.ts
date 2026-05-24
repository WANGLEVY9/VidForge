import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

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
}
