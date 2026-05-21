import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script, ScriptStatus, VideoStyle } from './entities/script.entity';
import { Storyboard } from './entities/storyboard.entity';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { UpdateStoryboardDto } from './dto/update-storyboard.dto';
import { SCRIPT_GENERATION_PROMPT } from './config/prompt.templates';

@Injectable()
export class ScriptService {
  constructor(
    @InjectRepository(Script)
    private scriptRepository: Repository<Script>,
    @InjectRepository(Storyboard)
    private storyboardRepository: Repository<Storyboard>,
  ) {}

  /**
   * 生成剧本
   */
  async generateScript(dto: GenerateScriptDto) {
    // 1. 创建草稿剧本
    const script = this.scriptRepository.create({
      title: `${dto.productName}带货脚本`,
      productName: dto.productName,
      sellingPoints: dto.sellingPoints,
      targetAudience: dto.targetAudience || '通用人群',
      scene: dto.scene || '日常场景',
      style: dto.style || VideoStyle.DYNAMIC,
      totalDuration: dto.totalDuration || 15,
      status: ScriptStatus.GENERATING,
      tags: dto.tags || [],
    });

    await this.scriptRepository.save(script);

    try {
      // 2. 构建Prompt
      const storyboardCount = Math.max(3, Math.min(6, Math.ceil((dto.totalDuration || 15) / 3)));
      let prompt = dto.customPrompt || SCRIPT_GENERATION_PROMPT;
      prompt = prompt
        .replace('{{productName}}', dto.productName)
        .replace('{{sellingPoints}}', dto.sellingPoints.join('、'))
        .replace('{{targetAudience}}', dto.targetAudience || '通用人群')
        .replace('{{scene}}', dto.scene || '日常场景')
        .replace('{{style}}', dto.style || '动感活力')
        .replace('{{totalDuration}}', String(dto.totalDuration || 15))
        .replace('{{storyboardCount}}', String(storyboardCount));

      // TODO: 后续对接大模型API，这里先返回Mock数据
      const mockResult = this.generateMockScript(dto, storyboardCount);

      // 3. 保存分镜
      const storyboards = mockResult.storyboards.map((sb) =>
        this.storyboardRepository.create({
          ...sb,
          script,
        })
      );

      await this.storyboardRepository.save(storyboards);

      // 4. 更新剧本状态
      script.status = ScriptStatus.COMPLETED;
      script.prompt = prompt;
      script.storyboards = storyboards;
      await this.scriptRepository.save(script);

      return this.findOne(script.id);
    } catch (error) {
      script.status = ScriptStatus.FAILED;
      await this.scriptRepository.save(script);
      throw new BadRequestException(`剧本生成失败: ${error.message}`);
    }
  }

  /**
   * 生成Mock剧本数据
   */
  private generateMockScript(dto: GenerateScriptDto, storyboardCount: number) {
    const totalDuration = dto.totalDuration || 15;
    const perDuration = Math.floor(totalDuration / storyboardCount);

    const storyboards = [];
    // 开头Hook
    storyboards.push({
      index: 1,
      sceneDescription: `特写展示${dto.productName}，高亮核心卖点：${dto.sellingPoints[0]}`,
      cameraMovement: '推近',
      dialogue: `你还在为${dto.scene || '日常使用'}烦恼吗？快来看看这个${dto.productName}！`,
      duration: perDuration,
      bgm: '动感轻快',
      subtitle: `新品${dto.productName}震撼上市！`,
    });

    // 中间卖点展示
    for (let i = 1; i < Math.min(storyboardCount - 1, dto.sellingPoints.length + 1); i++) {
      const sellingPoint = dto.sellingPoints[i - 1] || '优质品质';
      storyboards.push({
        index: i + 1,
        sceneDescription: `${dto.productName}使用场景展示，突出卖点：${sellingPoint}`,
        cameraMovement: i % 2 === 0 ? '平移' : '固定',
        dialogue: `它的${sellingPoint}，能完美解决你的需求！`,
        duration: perDuration,
        bgm: '动感轻快',
        subtitle: sellingPoint,
      });
    }

    // 结尾CTA
    storyboards.push({
      index: storyboardCount,
      sceneDescription: `${dto.productName}包装展示，配合购买引导文字`,
      cameraMovement: '拉远',
      dialogue: '现在下单还有优惠，赶紧点击小黄车购买吧！',
      duration: totalDuration - perDuration * (storyboardCount - 1),
      bgm: '激昂上升',
      subtitle: '点击下方链接立即购买！',
    });

    return {
      title: `${dto.productName}15s带货脚本`,
      totalDuration,
      storyboards,
    };
  }

  /**
   * 获取剧本列表
   */
  async findAll(query: { page?: number; pageSize?: number; keyword?: string }) {
    const { page = 1, pageSize = 20, keyword } = query;
    const qb = this.scriptRepository
      .createQueryBuilder('script')
      .leftJoinAndSelect('script.storyboards', 'storyboards')
      .where('script.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('script.createdAt', 'DESC');

    if (keyword) {
      qb.andWhere('(script.title LIKE :keyword OR script.productName LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    const [list, total] = await qb
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

  /**
   * 获取剧本详情
   */
  async findOne(id: string) {
    const script = await this.scriptRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['storyboards'],
      order: { storyboards: { index: 'ASC' } },
    });

    if (!script) {
      throw new BadRequestException('剧本不存在');
    }

    return script;
  }

  /**
   * 删除剧本
   */
  async remove(id: string) {
    const script = await this.findOne(id);
    if (!script) {
      throw new BadRequestException('剧本不存在');
    }

    await this.scriptRepository.update(id, { isDeleted: true });
    return { success: true };
  }

  /**
   * 更新剧本分镜
   */
  async updateStoryboards(scriptId: string, storyboards: UpdateStoryboardDto[]) {
    const script = await this.findOne(scriptId);
    if (!script) {
      throw new BadRequestException('剧本不存在');
    }

    // 开启事务
    await this.storyboardRepository.manager.transaction(async (transactionalEntityManager) => {
      // 1. 删除不在传入列表中的旧分镜
      const existingIds = storyboards.filter(sb => sb.id).map(sb => sb.id);
      if (existingIds.length > 0) {
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(Storyboard)
          .where('scriptId = :scriptId', { scriptId })
          .andWhere('id NOT IN (:...existingIds)', { existingIds })
          .execute();
      } else {
        // 如果没有传入ID，删除所有旧分镜
        await transactionalEntityManager.delete(Storyboard, { script: { id: scriptId } });
      }

      // 2. 更新或新增分镜
      for (let i = 0; i < storyboards.length; i++) {
        const sb = storyboards[i];
        const storyboardData = {
          ...sb,
          index: i + 1, // 重新排序，保证序号连续
          script,
        };

        if (sb.id) {
          // 更新现有分镜
          await transactionalEntityManager.update(Storyboard, sb.id, storyboardData);
        } else {
          // 新增分镜
          const newStoryboard = transactionalEntityManager.create(Storyboard, storyboardData);
          await transactionalEntityManager.save(newStoryboard);
        }
      }

      // 3. 更新剧本总时长
      const totalDuration = storyboards.reduce((sum, sb) => sum + sb.duration, 0);
      await transactionalEntityManager.update(Script, scriptId, { totalDuration });
    });

    return this.findOne(scriptId);
  }

  /**
   * 重新生成分镜
   */
  async regenerateStoryboard(scriptId: string, storyboardIndex: number, prompt?: string) {
    const script = await this.findOne(scriptId);
    if (!script) {
      throw new BadRequestException('剧本不存在');
    }

    // TODO: 对接大模型重新生成分镜，这里先返回Mock数据
    const mockStoryboard = {
      index: storyboardIndex,
      sceneDescription: prompt ? `根据Prompt生成的画面：${prompt}` : `重新生成的第${storyboardIndex}个分镜画面`,
      cameraMovement: '推近',
      dialogue: prompt ? `根据Prompt生成的台词：${prompt}` : '这是重新生成的台词',
      duration: 3,
      bgm: '动感轻快',
      subtitle: '重新生成的字幕',
    };

    // 更新分镜
    const storyboards = script.storyboards.map(sb => 
      sb.index === storyboardIndex ? { ...sb, ...mockStoryboard } : sb
    );

    return this.updateStoryboards(scriptId, storyboards);
  }
}
