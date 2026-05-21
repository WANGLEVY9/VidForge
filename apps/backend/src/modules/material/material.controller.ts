import { Controller, Post, Get, Delete, Param, Body, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialService } from './material.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { multerConfig } from './config/multer.config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaterialType } from './entities/material.entity';

@ApiTags('素材管理')
@Controller('material')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post('upload')
  @ApiOperation({ summary: '上传素材' })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  upload(@UploadedFile() file: Express.Multer.File, @Body() createMaterialDto: CreateMaterialDto) {
    return this.materialService.upload(file, createMaterialDto);
  }

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  findAll(@Query() query: { page?: number; pageSize?: number; type?: MaterialType; keyword?: string }) {
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
