import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('模板管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('template')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: '创建模板' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTemplateDto) {
    return this.templateService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取模板列表(可按品类/风格过滤)' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryTemplateDto) {
    return this.templateService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模板详情' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.templateService.findOne(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除模板' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.templateService.remove(user.sub, id);
  }
}
