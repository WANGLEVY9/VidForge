export enum ScriptStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum VideoStyle {
  REALISTIC = 'realistic',
  ANIMATION = 'animation',
  MINIMALIST = 'minimalist',
  LUXURY = 'luxury',
  FRESH = 'fresh',
  DYNAMIC = 'dynamic',
  VINTAGE = 'vintage',
  TECHNOLOGY = 'technology',
}

export const VideoStyleText = {
  [VideoStyle.REALISTIC]: '写实风',
  [VideoStyle.ANIMATION]: '动画风',
  [VideoStyle.MINIMALIST]: '极简风',
  [VideoStyle.LUXURY]: '奢华风',
  [VideoStyle.FRESH]: '清新风',
  [VideoStyle.DYNAMIC]: '动感风',
  [VideoStyle.VINTAGE]: '复古风',
  [VideoStyle.TECHNOLOGY]: '科技风',
};

export const ScriptStatusText = {
  [ScriptStatus.DRAFT]: '草稿',
  [ScriptStatus.GENERATING]: '生成中',
  [ScriptStatus.COMPLETED]: '已完成',
  [ScriptStatus.FAILED]: '生成失败',
};

export interface Storyboard {
  id: string;
  index: number;
  sceneDescription: string;
  cameraMovement: string;
  dialogue: string;
  duration: number;
  bgm: string;
  subtitle: string;
  style?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Script {
  id: string;
  title: string;
  productName: string;
  sellingPoints: string[];
  targetAudience: string;
  scene: string;
  style: VideoStyle;
  totalDuration: number;
  status: ScriptStatus;
  prompt: string;
  tags: string[];
  storyboards: Storyboard[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateScriptParams {
  productName: string;
  sellingPoints: string[];
  targetAudience?: string;
  scene?: string;
  style?: VideoStyle;
  totalDuration?: number;
  customPrompt?: string;
  tags?: string[];
}
