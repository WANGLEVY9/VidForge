import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageService } from './storage.service';

/**
 * BGM(背景音乐)选择服务
 *
 * 实现策略:
 * - 在 storage/bgm/ 目录下放置不同风格的 mp3 (项目部署时由运维灌入)
 * - 文件名按 "<style>__<name>.mp3" 约定,例如:
 *     dynamic__upbeat-loop.mp3
 *     fresh__morning-coffee.mp3
 *     luxury__cinematic-pad.mp3
 *
 * - 当某风格无可用 BGM,返回 undefined,让合片管线静音/仅人声
 * - 多文件随机选,避免每次同款
 *
 * 为了让首次部署不至于"光秃秃",提供一个 ensureSeed() 方法
 * 写入一个 README 占位,引导运维放置真实 BGM。
 */
@Injectable()
export class BgmService {
  private readonly logger = new Logger(BgmService.name);
  private cache: Map<string, string[]> = new Map();
  private cacheBuiltAt = 0;

  constructor(private readonly storage: StorageService) {}

  async pickByStyle(style: string): Promise<string | undefined> {
    await this.refreshCache();
    const normalized = (style || 'default').toLowerCase();
    const aliasMap: Record<string, string[]> = {
      写实: ['realistic', 'default'],
      动画: ['animated', 'fresh'],
      极简: ['minimal', 'clean'],
      奢华: ['luxury', 'cinematic'],
      清新: ['fresh', 'minimal'],
      动感: ['dynamic', 'upbeat'],
      复古: ['retro', 'vintage'],
      科技: ['tech', 'electronic'],
    };
    const candidates = aliasMap[style] || [normalized, 'default'];
    for (const key of candidates) {
      const list = this.cache.get(key);
      if (list && list.length) {
        return list[Math.floor(Math.random() * list.length)];
      }
    }
    // 兜底:任何 style 都返回(如果有的话)
    for (const list of this.cache.values()) {
      if (list.length) return list[0];
    }
    return undefined;
  }

  private async refreshCache(): Promise<void> {
    const now = Date.now();
    if (this.cache.size > 0 && now - this.cacheBuiltAt < 60_000) return;
    this.cache.clear();
    const root = this.storage.getBgmRoot();
    try {
      await fs.mkdir(root, { recursive: true });
      const files = await fs.readdir(root);
      for (const f of files) {
        if (!/\.(mp3|m4a|wav|aac)$/i.test(f)) continue;
        // 期望命名: <style>__<name>.<ext>
        const match = f.match(/^([a-zA-Z一-龥]+)__/);
        const style = (match?.[1] ?? 'default').toLowerCase();
        const list = this.cache.get(style) ?? [];
        list.push(path.join(root, f));
        this.cache.set(style, list);
      }
      this.cacheBuiltAt = now;
      const total = Array.from(this.cache.values()).reduce((s, l) => s + l.length, 0);
      if (total > 0) {
        this.logger.log(`BGM 库刷新: ${total} 个文件,${this.cache.size} 种风格`);
      }
    } catch (err: any) {
      this.logger.warn(`BGM 目录读取失败: ${err?.message ?? err}`);
    }
  }

  /** 启动时输出"如何放 BGM"的指引 */
  async ensureSeedReadme(): Promise<void> {
    const root = this.storage.getBgmRoot();
    await fs.mkdir(root, { recursive: true });
    const readme = path.join(root, 'README.txt');
    try {
      await fs.access(readme);
    } catch {
      await fs.writeFile(
        readme,
        [
          '将免版权 BGM 文件按以下命名规则放在本目录:',
          '<风格>__<名称>.mp3',
          '',
          '风格关键字示例(对应剧本风格):',
          '  dynamic 动感 / fresh 清新 / luxury 奢华 / minimal 极简',
          '  realistic 写实 / retro 复古 / tech 科技 / animated 动画',
          '',
          '示例文件名:',
          '  dynamic__upbeat-loop-30s.mp3',
          '  fresh__morning-light.mp3',
          '  luxury__velvet-piano.mp3',
        ].join('\n'),
        'utf8',
      );
    }
  }
}
