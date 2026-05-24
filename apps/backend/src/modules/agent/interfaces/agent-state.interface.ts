export interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url?: string;
  thumbnailUrl?: string;
  tags?: string[];
}

export interface ShotOutput {
  id: string;
  order: number;
  description: string;
  duration: number;
  type: 'text-to-video' | 'image-to-video';
  script: string;
}

export interface AgentState {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentNode: string;
  progress: number;

  // Input
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;
  duration?: number;

  // Material Analysis output
  materialAnalysis?: {
    matchedMaterials: MaterialItem[];
    tags: Record<string, any>;
    analysis: string;
  };

  // Script Generation output
  scriptGeneration?: {
    shots: ShotOutput[];
    voiceover: string;
    style: string;
  };

  // Video Composition output
  videoComposition?: {
    videoUrl: string;
    duration: number;
    ttsUrl: string;
    subtitleUrl: string;
    bgmUrl: string;
  };

  // Quality Control output
  qualityControl?: {
    contentScore: number;
    qualityScore: number;
    passed: boolean;
    issues: string[];
  };

  // Error handling
  errors: Array<{ node: string; message: string; timestamp: Date }>;
  retryCount: number;
}
