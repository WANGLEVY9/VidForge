import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductSpaceService } from './product-space.service';
import { CreateProductSpaceDto, UpdateProductSpaceDto } from './dto/product-space.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('商品空间')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class ProductSpaceController {
  constructor(private readonly service: ProductSpaceService) {}

  @Get()
  @ApiOperation({ summary: '列出当前用户的所有商品空间' })
  list(@CurrentUser() user: JwtPayload) {
    return this.service.listForUser(user.sub);
  }

  @Post()
  @ApiOperation({ summary: '创建新的商品空间' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductSpaceDto) {
    return this.service.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取商品空间详情' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新商品空间' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductSpaceDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '归档商品空间' })
  archive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.archive(user.sub, id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: '设为默认商品空间' })
  setDefault(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.setDefault(user.sub, id);
  }
}
