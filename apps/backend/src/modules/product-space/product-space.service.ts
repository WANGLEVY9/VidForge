import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductSpace } from './entities/product-space.entity';
import { CreateProductSpaceDto, UpdateProductSpaceDto } from './dto/product-space.dto';

@Injectable()
export class ProductSpaceService {
  private readonly logger = new Logger(ProductSpaceService.name);

  constructor(
    @InjectRepository(ProductSpace)
    private readonly repo: Repository<ProductSpace>,
  ) {}

  /**
   * 用户列出自己的所有空间（不返回已归档的）
   */
  async listForUser(userId: string): Promise<ProductSpace[]> {
    return this.repo.find({
      where: { userId, isArchived: false },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async create(userId: string, dto: CreateProductSpaceDto): Promise<ProductSpace> {
    const exists = await this.repo.count({ where: { userId } });
    const space = this.repo.create({
      userId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      productName: dto.productName?.trim(),
      category: dto.category?.trim(),
      coverUrl: dto.coverUrl,
      isDefault: exists === 0, // 第一个空间自动设为默认
    });
    return this.repo.save(space);
  }

  async findOne(userId: string, spaceId: string): Promise<ProductSpace> {
    const space = await this.repo.findOne({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('商品空间不存在');
    if (space.userId !== userId) throw new ForbiddenException('无权访问该商品空间');
    return space;
  }

  async update(userId: string, spaceId: string, dto: UpdateProductSpaceDto): Promise<ProductSpace> {
    const space = await this.findOne(userId, spaceId);
    if (dto.name !== undefined) space.name = dto.name.trim();
    if (dto.description !== undefined) space.description = dto.description.trim();
    if (dto.productName !== undefined) space.productName = dto.productName.trim();
    if (dto.category !== undefined) space.category = dto.category.trim();
    if (dto.coverUrl !== undefined) space.coverUrl = dto.coverUrl;
    return this.repo.save(space);
  }

  async archive(userId: string, spaceId: string): Promise<void> {
    const space = await this.findOne(userId, spaceId);
    space.isArchived = true;
    await this.repo.save(space);
  }

  async setDefault(userId: string, spaceId: string): Promise<void> {
    await this.findOne(userId, spaceId); // 校验权限
    await this.repo.update({ userId }, { isDefault: false });
    await this.repo.update({ id: spaceId }, { isDefault: true });
  }

  /**
   * 给某用户确保至少有一个默认空间。
   * 在用户登录或首次访问时被调用。
   */
  async ensureDefaultForUser(userId: string, fallbackName = '我的工作台'): Promise<ProductSpace> {
    const list = await this.repo.find({ where: { userId, isArchived: false } });
    if (list.length > 0) {
      const def = list.find((s) => s.isDefault) ?? list[0];
      return def;
    }
    return this.create(userId, { name: fallbackName, description: '系统自动创建的默认空间' });
  }

  /**
   * 校验某 spaceId 是否归属当前用户；返回 space 实体。
   * 用于其他业务模块快速校验
   */
  async assertOwnership(userId: string, spaceId: string): Promise<ProductSpace> {
    return this.findOne(userId, spaceId);
  }
}
