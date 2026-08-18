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

## Agent video-operation ledger

The Agent Composition node records each paid video request in
`provider_operations` before calling the adapter. The record is keyed by the
provider and a stable idempotency key, then updated with the remote task ID and
terminal result. This lets a resumed graph poll a known remote task rather than
blindly submit another request.

The ledger stores only a deterministic request hash and sanitized metadata; it
must not contain raw secrets. It does not provide exactly-once delivery by
itself: adapters must forward idempotency keys to providers that support them,
and a future transactional outbox is still needed to coordinate database,
queue and remote side effects.

Run owners can inspect sanitized records through
`GET /api/agent/runs/:taskId/audit`. See
[Agent reliability model](./RELIABILITY_MODEL.md) for failure semantics.
