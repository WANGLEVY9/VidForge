/**
 * 集中管理队列名称与任务名称,避免散落字符串。
 *
 * 注意:BullMQ ≥ 5 不允许队列名包含 `:` 字符(会被用作 Redis key 分隔符),
 *       因此用 `-` 作为分隔符。
 */
export const QUEUE_NAMES = {
  /** 单分镜视频生成 (调 ARK Seedance) */
  CREATION_SHOT: 'creation-shot',
  /** 多分镜合片 (FFmpeg concat + 字幕 + BGM) */
  CREATION_COMPOSE: 'creation-compose',
  /** 导出转码 (FFmpeg 转格式 / 分辨率) */
  EXPORT_ENCODE: 'export-encode',
  /** 素材自动打标 (ARK 视觉理解) */
  MATERIAL_ANALYZE: 'material-analyze',
  /** 独立 Agent Worker 消费的 LangGraph 工作流 */
  AGENT_RUN: 'agent-run',
} as const;

export const JOB_NAMES = {
  GENERATE_SHOT: 'generate-shot',
  COMPOSE_VIDEO: 'compose-video',
  ENCODE_EXPORT: 'encode-export',
  ANALYZE_MATERIAL: 'analyze-material',
  RUN_AGENT: 'run-agent',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
