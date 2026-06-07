import { create } from 'zustand';
import type { ScriptResult } from '../services/script';

/**
 * 跨页面剧本交付:用于把剧本页生成的剧本(包含 shots/title/duration 等)
 * 一次性带到视频生成页,避免用户在视频页重新输入主题再次调用 LLM 生成。
 *
 * 用法:
 *   - 剧本页生成成功 → setPending(result) + navigate(/workspace/.../video)
 *   - 视频页 mount → consume() 取出并清空,根据 pending 初始化 storyboard
 *
 * 消费即清空,刷新视频页不会重复带入旧剧本。
 *
 * 也包含一个用户级别 prompt 字段,作为视频页 form.prompt 的初值。
 */
interface PendingHandoff {
  script: ScriptResult;
  prompt: string;
  /** 触发跳转时的来源 spaceId,用于视频页校验同空间 */
  spaceId?: string;
  /** 写入时间戳,超过一定时长(可选)可视为过期 */
  createdAt: number;
}

interface State {
  pending: PendingHandoff | null;
}

interface Actions {
  setPending: (script: ScriptResult, prompt: string, spaceId?: string) => void;
  consume: () => PendingHandoff | null;
  clear: () => void;
}

export const useScriptHandoffStore = create<State & Actions>((set, get) => ({
  pending: null,
  setPending: (script, prompt, spaceId) =>
    set({
      pending: { script, prompt, spaceId, createdAt: Date.now() },
    }),
  consume: () => {
    const current = get().pending;
    if (current) set({ pending: null });
    return current;
  },
  clear: () => set({ pending: null }),
}));
