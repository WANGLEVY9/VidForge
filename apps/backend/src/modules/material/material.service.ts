import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { Material, MaterialType } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { OssService } from '../common/services/oss.service';
import { generateFileName } from '@vidforge/common';

const ffprobe = promisify(ffmpeg.ffprobe);

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    private ossService: OssService,
  ) {}

  async upload(file: Express.Multer.File, createMaterialDto: CreateMaterialDto) {
    // 上传到OSS
    const { url, fileName } = await this.ossService.uploadFile(file);

    // 获取视频/音频时长
    let duration: number | null = null;
    if (createMaterialDto.type === MaterialType.VIDEO || createMaterialDto.type === MaterialType.AUDIO) {
      try {
        const metadata = await ffprobe(file.buffer);
        duration = Math.round(metadata.format.duration);
      } catch (error) {
        // 获取时长失败不影响上传
        console.warn('获取媒体时长失败:', error);
      }
    }

    const material = this.materialRepository.create({
      name: createMaterialDto.name || file.originalname,
      type: createMaterialDto.type,
      url,
      fileName,
      size: file.size,
      mimeType: file.mimetype,
      duration,
      tags: createMaterialDto.tags || [],
    });

    return this.materialRepository.save(material);
  }

  async findAll(query: { page?: number; pageSize?: number; type?: MaterialType; keyword?: string }) {
    const { page = 1, pageSize = 20, type, keyword } = query;
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .where('material.isDeleted = :isDeleted', { isDeleted: false });

    if (type) {
      qb.andWhere('material.type = :type', { type });
    }

    if (keyword) {
      qb.andWhere('(material.name LIKE :keyword OR material.tags LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    const [list, total] = await qb
      .orderBy('material.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    return this.materialRepository.findOneBy({ id, isDeleted: false });
  }

  async remove(id: string) {
    const material = await this.findOne(id);
    if (!material) {
      throw new BadRequestException('素材不存在');
    }

    // 删除OSS文件
    if (material.fileName) {
      try {
        await this.ossService.deleteFile(material.fileName);
      } catch (error) {
        console.warn('删除OSS文件失败:', error);
      }
    }

    await this.materialRepository.update(id, { isDeleted: true });
    return { success: true };
  }
}
