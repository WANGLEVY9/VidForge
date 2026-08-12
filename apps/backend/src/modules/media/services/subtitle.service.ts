import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SubtitleLine {
  /** 起始秒 */
  startSec: number;
  /** 结束秒 */
  endSec: number;
  /** 字幕文本 */
  text: string;
}

/**
 * 字幕生成服务
 *
 * - 输入:每个分镜的 caption / voiceover + duration → 推算时间轴
 * - 输出:标准 SRT 文件
 *
 * V1 实现按"分镜均匀分配时长"的策略:
 *   shot[i].caption 占据 sum(duration[0..i-1])..sum(duration[0..i])
 * 长 caption 会被自动按标点分句、按时长均匀切分为多行。
 *
 * 后续若接入 ASR(Automatic Speech Recognition),可以在 voiceover 真实生成 TTS 后,
 * 用语音对齐(Forced Alignment)拿到精确逐词时间戳。
 */
@Injectable()
export class SubtitleService {
  /**
   * 根据分镜列表构造字幕行
   */
  buildLinesFromShots(
    shots: Array<{ caption?: string; voiceover?: string; duration?: number }>
  ): SubtitleLine[] {
    const lines: SubtitleLine[] = [];
    let cursor = 0;
    for (const shot of shots) {
      const duration = Math.max(2, shot.duration ?? 5);
      // 优先用 caption,没有就用 voiceover 缩略
      const text = (shot.caption || this.condenseVoiceover(shot.voiceover) || '').trim();
      if (!text) {
        cursor += duration;
        continue;
      }

      // 长字幕按标点拆分
      const chunks = this.splitByPunctuation(text);
      const perChunk = duration / chunks.length;
      chunks.forEach((chunk, i) => {
        const start = cursor + i * perChunk;
        const end = start + perChunk - 0.05; // 留 50ms gap
        lines.push({ startSec: start, endSec: end, text: chunk });
      });

      cursor += duration;
    }
    return lines;
  }

  /** 把 SubtitleLine[] 写为 SRT 文件 */
  async writeSrt(lines: SubtitleLine[], outPath: string): Promise<string> {
    const body = lines
      .map((line, i) => {
        const idx = i + 1;
        return `${idx}\n${this.formatSrtTime(line.startSec)} --> ${this.formatSrtTime(line.endSec)}\n${line.text}\n`;
      })
      .join('\n');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, body, 'utf8');
    return outPath;
  }

  // ───────────────────────────────────────
  //  内部工具
  // ───────────────────────────────────────

  private condenseVoiceover(voiceover?: string): string {
    if (!voiceover) return '';
    // 取前两句作为字幕
    const sentences = voiceover.split(/[。！？!?]+/).filter(Boolean);
    return sentences.slice(0, 2).join('。').slice(0, 30);
  }

  private splitByPunctuation(text: string): string[] {
    // 按中文逗号/句号/分号拆分,过滤空段
    const parts = text
      .split(/[,,。.;;！!?？\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return [text];
    // 进一步合并过短的段(<6 字)到下一段
    const merged: string[] = [];
    for (const p of parts) {
      if (merged.length > 0 && merged[merged.length - 1].length < 6) {
        merged[merged.length - 1] = merged[merged.length - 1] + p;
      } else {
        merged.push(p);
      }
    }
    return merged;
  }

  private formatSrtTime(sec: number): string {
    if (sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec - Math.floor(sec)) * 1000);
    return (
      String(h).padStart(2, '0') +
      ':' +
      String(m).padStart(2, '0') +
      ':' +
      String(s).padStart(2, '0') +
      ',' +
      String(ms).padStart(3, '0')
    );
  }
}
