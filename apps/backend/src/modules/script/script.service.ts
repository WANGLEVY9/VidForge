import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script } from './entities/script.entity';
import { CreateScriptDto } from './dto/create-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    @InjectRepository(Script)
    private scriptRepository: Repository<Script>,
  ) {}

  async generate(dto: GenerateScriptDto): Promise<any> {
    try {
      // In production, call AI service here
      return this.generateFallback(dto);
    } catch (error) {
      this.logger.error('剧本生成失败', error);
      return this.generateFallback(dto);
    }
  }

  private generateFallback(dto: GenerateScriptDto): any {
    return {
      title: `${dto.productName || '商品'} · 带货视频剧本`,
      duration: '45秒',
      hooks: [
        { time: '0-3s', content: '"大家好，今天给大家推荐一款超好用的产品！"', type: 'hook' },
        { time: '3-10s', content: '（展示产品外观）"看这个设计，非常有质感"', type: 'intro' },
        { time: '10-25s', content: '（使用效果展示）"你们看这个效果，真的太惊人了"', type: 'demo' },
        { time: '25-35s', content: '（对比/实测）"和其他产品对比一下，优势明显"', type: 'proof' },
        { time: '35-42s', content: '"总结卖点，性价比超高"', type: 'feature' },
        { time: '42-45s', content: '"链接在下方，赶紧下单吧！"', type: 'cta' },
      ],
      voiceover: '语速中等，语气热情有感染力。',
      bgmSuggestion: '推荐轻快节奏的BGM',
      tags: ['好物推荐', '带货视频', dto.category],
    };
  }

  async create(dto: CreateScriptDto): Promise<Script> {
    const script = this.scriptRepository.create(dto);
    return this.scriptRepository.save(script);
  }

  async findAll(): Promise<Script[]> {
    return this.scriptRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Script> {
    return this.scriptRepository.findOneOrFail({ where: { id } });
  }
}
