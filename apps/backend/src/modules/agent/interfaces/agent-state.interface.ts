export interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url?: string;
  thumbnailUrl?: string;
  tags?: string[];
  /** 与查询的相关度 0-1 */
  relevance?: number;
  /** 模型生成的画面描述,作为 image-to-video 的 firstFrame 提示 */
  caption?: string;
}

export interface ShotOutput {
  id: string;
  order: number;
  description: string;
  duration: number;
  type: 'text-to-video' | 'image-to-video';
  script: string;
  /** 屏幕字幕 */
  caption?: string;
  /** 镜头运动 */
  cameraMovement?: string;
  /** 分镜角色: hook / demo / cta 等 */
  role?: string;
  /** 关联的素材 ID(image-to-video 模式才有) */
  materialId?: string;
  /** 真实生成出的视频 URL */
  videoUrl?: string;
  /** 该分镜的 ARK 任务 ID */
  arkTaskId?: string;
  /** 失败信息 */
  errorMessage?: string;
}

export interface AgentState {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentNode: string;
  progress: number;

  // Input
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;
  duration?: number;
  /** 当前用户(用于查素材库) */
  userId?: string;
  /** 当前商品空间(用于隔离查询) */
  productSpaceId?: string;

  /**
   * Retrieved long-term context. Hits are scored and provenance-aware so
   * downstream agents can treat them as hints, not as untrusted instructions.
   */
  memoryContext?: {
    recalled: Array<{
      id: string;
      kind: string;
      content: string;
      score: number;
    }>;
    /** Serialized context budget used by downstream prompt builders. */
    maxChars?: number;
  };

  // Material Analysis output
  materialAnalysis?: {
    matchedMaterials: MaterialItem[];
    tags: Record<string, any>;
    analysis: string;
    /** 是否真的从素材库找到了相关素材 */
    hasRealMaterials: boolean;
  };

  // Script Generation output
  scriptGeneration?: {
    shots: ShotOutput[];
    voiceover: string;
    style: string;
    /** 模型来源 */
    source: 'ark' | 'fallback';
    fallbackReason?: string;
    /** RAG evidence retained for auditability and downstream routing. */
    ragReferences?: Array<{ id: string; hookType: string; performance: string }>;
  };

  // Video Composition output
  videoComposition?: {
    /** 最终成片 URL */
    videoUrl: string;
    /** 时长 */
    duration: number;
    /** 是否走了真实 ARK 视频 */
    hasRealVideo: boolean;
    /** 是否成功合片(否则只是首段视频) */
    composed: boolean;
    /** 各分镜的真实结果 */
    shotResults: Array<{ shotId: string; videoUrl?: string; error?: string }>;
  };

  // Quality Control output(多维度评分)
  qualityControl?: {
    /** 综合分 0-100 */
    qualityScore: number;
    /** 是否通过 */
    passed: boolean;
    /** 各维度子分 */
    dimensions: {
      /** 内容完整性(分镜全成功 / 部分失败) */
      completeness: number;
      /** 时长达标(在 8-20 秒) */
      duration: number;
      /** 文本-画面一致性(LLM 多模态判定) */
      consistency: number;
      /** 合规性(无违规词) */
      compliance: number;
      /** 钩子强度(开头 3 秒抓眼球程度) */
      hookStrength: number;
    };
    /** 具体问题列表,供 replan 使用 */
    issues: Array<{
      shotId?: string;
      dimension: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      suggestion?: string;
    }>;
    /** 评价者的简短反馈,会拼回 prompt 用于 replan */
    feedback?: string;
  };

  // Trace 维度,记录每个 span 的耗时与产出
  trace?: Array<{
    span: string;
    startedAt: string;
    endedAt: string;
    latencyMs: number;
    status: 'ok' | 'error';
    summary?: string;
    errorMessage?: string;
  }>;

  // Error handling
  errors: Array<{ node: string; message: string; timestamp: Date }>;
  retryCount: number;
}
