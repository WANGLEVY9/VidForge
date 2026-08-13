# Provider contracts

VidForge keeps vendor-specific code behind business-level provider contracts in [`apps/backend/src/providers/provider.contracts.ts`](../apps/backend/src/providers/provider.contracts.ts).

| Capability       | Current adapter   | Replacement boundary      |
| ---------------- | ----------------- | ------------------------- |
| Text generation  | `ArkTextService`  | `TextGenerationProvider`  |
| Video generation | `ArkVideoService` | `VideoGenerationProvider` |
| Text-to-speech   | `TtsService`      | `TextToSpeechProvider`    |
| Object storage   | `OssService`      | `ObjectStorageProvider`   |
| Media processing | `FfmpegService`   | `MediaProcessingProvider` |

The contracts describe VidForge operations rather than ARK, OpenSpeech, OSS, or FFmpeg SDK request objects. New adapters should implement the relevant interface and preserve the documented fallback behavior (for example, TTS may return `mode: 'silence'` when credentials are unavailable).

The current Nest modules still inject the concrete adapters directly; the next provider task is to bind these interfaces to runtime tokens so deployments can select adapters through configuration without changing business services.
