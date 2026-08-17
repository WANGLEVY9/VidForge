/**
 * Stable seams for replacing external AI/media implementations.
 *
 * These contracts intentionally describe business operations rather than SDK
 * request shapes. Concrete adapters can therefore be swapped without making
 * agents, queues, or the composer depend on a vendor package.
 */

export type ProviderCapability = 'text' | 'video' | 'tts' | 'storage' | 'media';

export interface TextProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<unknown>;
}

export interface TextProviderRequest {
  messages: TextProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  modelKey?: string;
  traceTaskId?: string;
  traceScope?: 'creation' | 'agent' | 'export' | 'material' | 'script';
  traceSpan?: string;
  traceUserId?: string;
}

export interface TextGenerationProvider {
  readonly capability: 'text';
  chatCompletion(options: TextProviderRequest): Promise<unknown>;
}

export interface VideoProviderRequest {
  prompt: string;
  /** Stable operation key used by providers that support request idempotency. */
  idempotencyKey?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  ratio?: '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9';
  resolution?: '480p' | '720p' | '1080p';
  duration?: number;
  modelKey?: string;
}

export interface VideoGenerationProvider {
  readonly capability: 'video';
  createTask(options: VideoProviderRequest): Promise<{ id: string }>;
  queryTask(taskId: string, apiKey?: string): Promise<unknown>;
}

export interface TtsSynthesisResult {
  outPath: string;
  durationSec: number;
  mode: 'real' | 'silence';
}

export interface TextToSpeechProvider {
  readonly capability: 'tts';
  hasRealTts(): boolean;
  synthesize(
    text: string,
    outPath: string,
    voiceType?: string,
    speedRatio?: number
  ): Promise<TtsSynthesisResult>;
}

export interface ObjectStorageProvider {
  readonly capability: 'storage';
  readonly enabled: boolean;
  upload(localPath: string, objectKey: string, mimeType?: string): Promise<string | null>;
  delete(objectKey: string): Promise<boolean>;
  getUrl(objectKey: string): string;
}

export interface MediaProcessingProvider {
  readonly capability: 'media';
  checkAvailable(): Promise<{ available: boolean; version?: string }>;
  downloadTo(url: string, destPath: string, maxBytes?: number): Promise<string>;
  concatVideos(
    inputs: string[],
    output: string,
    ratio?: '9:16' | '16:9' | '1:1',
    resolution?: '480p' | '720p' | '1080p' | '2160p'
  ): Promise<string>;
  burnSubtitle(input: string, subtitlePath: string, output: string): Promise<string>;
  mixAudio(
    videoPath: string,
    voicePath: string | undefined,
    bgmPath: string | undefined,
    output: string
  ): Promise<string>;
  transcode(
    input: string,
    output: string,
    opts: {
      format: 'mp4' | 'mov' | 'webm' | 'gif';
      ratio?: '9:16' | '16:9' | '1:1';
      resolution: '480p' | '720p' | '1080p' | '2160p';
    }
  ): Promise<string>;
  extractKeyframes(input: string, outDir: string, count?: number): Promise<string[]>;
  probe(input: string): Promise<{ durationSec: number; width?: number; height?: number }>;
}
